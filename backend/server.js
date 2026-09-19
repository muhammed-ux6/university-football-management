const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const PORT = Number(process.env.PORT) || 3000;
const ROOT_DIRECTORY = path.resolve(__dirname, "..");
const DATA_FILE = path.join(__dirname, "data.json");
const RESOURCE_NAMES = [
    "competitions",
    "teams",
    "players",
    "fixtures",
    "results",
    "news"
];

const emptyData = () => Object.fromEntries(
    RESOURCE_NAMES.map((resource) => [resource, []])
);

function readData() {
    if (!fs.existsSync(DATA_FILE)) {
        const data = emptyData();
        writeData(data);
        return data;
    }

    try {
        const parsedData = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
        return Object.fromEntries(
            RESOURCE_NAMES.map((resource) => [
                resource,
                Array.isArray(parsedData[resource]) ? parsedData[resource] : []
            ])
        );
    } catch (error) {
        throw new Error(`Unable to read ${DATA_FILE}: ${error.message}`);
    }
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function sendJson(response, statusCode, payload) {
    response.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    });
    response.end(JSON.stringify(payload));
}

function getRequestBody(request) {
    return new Promise((resolve, reject) => {
        let body = "";

        request.on("data", (chunk) => {
            body += chunk;
            if (body.length > 1_000_000) {
                reject(new Error("Request body is too large."));
                request.destroy();
            }
        });

        request.on("end", () => {
            if (!body) {
                resolve({});
                return;
            }

            try {
                resolve(JSON.parse(body));
            } catch {
                reject(new Error("Request body must be valid JSON."));
            }
        });

        request.on("error", reject);
    });
}

function serveStaticFile(response, pathname) {
    const requestedPath = pathname === "/" ? "/index.html" : pathname;
    const filePath = path.resolve(ROOT_DIRECTORY, `.${requestedPath}`);

    if (!filePath.startsWith(ROOT_DIRECTORY) || !fs.existsSync(filePath)) {
        sendJson(response, 404, { error: "Page not found." });
        return;
    }

    const extension = path.extname(filePath);
    const contentTypes = {
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".svg": "image/svg+xml"
    };

    response.writeHead(200, {
        "Content-Type": contentTypes[extension] || "application/octet-stream"
    });
    fs.createReadStream(filePath).pipe(response);
}

async function handleRequest(request, response) {
    const requestUrl = new URL(request.url, `http://${request.headers.host}`);
    const pathParts = requestUrl.pathname.split("/").filter(Boolean);

    if (request.method === "OPTIONS") {
        sendJson(response, 204, {});
        return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/health") {
        sendJson(response, 200, { status: "ok", service: "university-football-management" });
        return;
    }

    if (pathParts[0] !== "api") {
        serveStaticFile(response, requestUrl.pathname);
        return;
    }

    const resource = pathParts[1];
    const recordId = pathParts[2];

    if (!RESOURCE_NAMES.includes(resource)) {
        sendJson(response, 404, { error: "Unknown API resource." });
        return;
    }

    const data = readData();

    if (request.method === "GET" && !recordId) {
        sendJson(response, 200, data[resource]);
        return;
    }

    if (request.method === "GET" && recordId) {
        const record = data[resource].find((item) => String(item.id) === recordId);
        sendJson(response, record ? 200 : 404, record || { error: "Record not found." });
        return;
    }

    if (!["POST", "PATCH", "DELETE"].includes(request.method) || (!recordId && request.method === "PATCH")) {
        sendJson(response, 405, { error: "Method not allowed." });
        return;
    }

    if (request.method === "DELETE") {
        const originalLength = data[resource].length;
        data[resource] = data[resource].filter((item) => String(item.id) !== recordId);

        if (data[resource].length === originalLength) {
            sendJson(response, 404, { error: "Record not found." });
            return;
        }

        writeData(data);
        sendJson(response, 200, { message: "Record deleted." });
        return;
    }

    const payload = await getRequestBody(request);

    if (request.method === "POST") {
        const record = {
            ...payload,
            id: payload.id || `${resource.slice(0, -1)}-${crypto.randomUUID()}`,
            createdAt: payload.createdAt || new Date().toISOString()
        };
        data[resource].push(record);
        writeData(data);
        sendJson(response, 201, record);
        return;
    }

    const recordIndex = data[resource].findIndex((item) => String(item.id) === recordId);
    if (recordIndex === -1) {
        sendJson(response, 404, { error: "Record not found." });
        return;
    }

    data[resource][recordIndex] = {
        ...data[resource][recordIndex],
        ...payload,
        id: data[resource][recordIndex].id,
        updatedAt: new Date().toISOString()
    };
    writeData(data);
    sendJson(response, 200, data[resource][recordIndex]);
}

const server = http.createServer((request, response) => {
    handleRequest(request, response).catch((error) => {
        console.error(error);
        sendJson(response, 500, { error: "The server could not complete the request." });
    });
});

server.listen(PORT, () => {
    console.log(`University Football Management is running at http://localhost:${PORT}`);
});