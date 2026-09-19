/* =========================================================
   UNIVERSITY FOOTBALL MANAGEMENT
   Shared JavaScript - script.js

   Works across:
   - Home
   - Competitions
   - Teams
   - Players
   - Fixtures
   - Results
   - Standings
   - News

   Vanilla JavaScript only
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    /* =====================================================
       STORAGE KEYS
       ===================================================== */

    const STORAGE_KEY = "ufm-data";
    const API_BASE_URL = "/api";
    const THEME_KEY = "ufm-theme";


    /* =====================================================
       DEFAULT APPLICATION DATA
       ===================================================== */

    const defaultData = {
        competitions: [],
        teams: [],
        players: [],
        fixtures: [],
        results: [],
        news: []
    };


    /* =====================================================
       UTILITY FUNCTIONS
       ===================================================== */

    function getData() {
        try {
            const storedData = localStorage.getItem(STORAGE_KEY);

            if (!storedData) {
                localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify(defaultData)
                );

                return structuredClone(defaultData);
            }

            return JSON.parse(storedData);
        } catch (error) {
            console.error("Unable to load application data:", error);
            return structuredClone(defaultData);
        }
    }


    function saveData(data) {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(data)
            );
        } catch (error) {
            console.error("Unable to save application data:", error);
        }
    }


    function createId(prefix = "item") {
        return `${prefix}-${Date.now()}-${Math.random()
            .toString(16)
            .slice(2)}`;
    }


    function escapeHTML(value) {
        const temporaryElement = document.createElement("div");
        temporaryElement.textContent = value;
        return temporaryElement.innerHTML;
    }


    let footballData = getData();

    let apiAvailable = false;
    let apiReadyPromise = Promise.resolve(false);

    async function synchronizeWithApi() {
        try {
            const resources = Object.keys(defaultData);
            const localData = footballData;
            const responses = await Promise.all(
                resources.map((resource) => fetch(`${API_BASE_URL}/${resource}`))
            );

            if (responses.some((response) => !response.ok)) return false;

            const records = await Promise.all(
                responses.map((response) => response.json())
            );

            const remoteData = Object.fromEntries(
                resources.map((resource, index) => [resource, records[index]])
            );
            apiAvailable = true;

            const remoteHasRecords = resources.some(
                (resource) => remoteData[resource].length > 0
            );
            const localHasRecords = resources.some(
                (resource) => localData[resource].length > 0
            );

            if (!remoteHasRecords && localHasRecords) {
                await Promise.all(
                    resources.flatMap((resource) =>
                        localData[resource].map((record) =>
                            fetch(`${API_BASE_URL}/${resource}`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(record)
                            })
                        )
                    )
                );
                footballData = localData;
            } else {
                footballData = remoteData;
            }

            saveData(footballData);
            updateDataCounts();
            updateCompetitionStatistics();
            return true;
        } catch (error) {
            console.info("Backend unavailable; using local browser data.");
            return false;
        }
    }

    async function createRemoteRecord(resource, record) {
        await apiReadyPromise;

        if (!apiAvailable) return record;

        const response = await fetch(`${API_BASE_URL}/${resource}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(record)
        });

        if (!response.ok) {
            throw new Error(`Unable to save ${resource} on the server.`);
        }

        return response.json();
    }


    /* =====================================================
       1. MOBILE NAVIGATION
       ===================================================== */

    function initializeNavigation() {
        const toggle = document.querySelector(".navigation-toggle");
        const menu = document.querySelector(".navigation-menu");

        if (!toggle || !menu) return;

        function openMenu() {
            menu.classList.add("is-open");
            toggle.setAttribute("aria-expanded", "true");
            toggle.setAttribute(
                "aria-label",
                "Close navigation menu"
            );
        }

        function closeMenu() {
            menu.classList.remove("is-open");
            toggle.setAttribute("aria-expanded", "false");
            toggle.setAttribute(
                "aria-label",
                "Open navigation menu"
            );
        }

        toggle.addEventListener("click", () => {
            const isOpen = menu.classList.contains("is-open");

            if (isOpen) {
                closeMenu();
            } else {
                openMenu();
            }
        });

        menu.addEventListener("click", (event) => {
            if (event.target.closest("a")) {
                closeMenu();
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                closeMenu();
            }
        });

        document.addEventListener("click", (event) => {
            const clickedMenu = menu.contains(event.target);
            const clickedToggle = toggle.contains(event.target);

            if (
                menu.classList.contains("is-open") &&
                !clickedMenu &&
                !clickedToggle
            ) {
                closeMenu();
            }
        });

        window.addEventListener("resize", () => {
            if (window.innerWidth >= 900) {
                closeMenu();
            }
        });
    }


    /* =====================================================
       2. DARK MODE
       ===================================================== */

    function initializeDarkMode() {
        const themeToggle =
            document.querySelector(".theme-toggle");

        try {
            const savedTheme =
                localStorage.getItem(THEME_KEY);

            if (savedTheme === "dark") {
                document.documentElement.classList.add(
                    "dark-mode"
                );
            }
        } catch (error) {
            console.warn("Theme could not be loaded.");
        }

        if (!themeToggle) return;

        function updateThemeButton() {
            const isDark =
                document.documentElement.classList.contains(
                    "dark-mode"
                );

            themeToggle.setAttribute(
                "aria-pressed",
                String(isDark)
            );

            themeToggle.setAttribute(
                "aria-label",
                isDark
                    ? "Switch to light mode"
                    : "Switch to dark mode"
            );
        }

        themeToggle.addEventListener("click", () => {
            const isDark =
                document.documentElement.classList.toggle(
                    "dark-mode"
                );

            try {
                localStorage.setItem(
                    THEME_KEY,
                    isDark ? "dark" : "light"
                );
            } catch (error) {
                console.warn("Theme preference could not be saved.");
            }

            updateThemeButton();
        });

        updateThemeButton();
    }


    /* =====================================================
       3. MODAL SYSTEM
       ===================================================== */

    function initializeModals() {
        const modalButtons =
            document.querySelectorAll("[data-modal-target]");

        if (!modalButtons.length) return;

        let activeModal = null;
        let previousFocusedElement = null;

        function openModal(modal) {
            if (!modal) return;

            previousFocusedElement =
                document.activeElement;

            modal.hidden = false;
            activeModal = modal;

            const firstFocusableElement =
                modal.querySelector(
                    "button, input, select, textarea, a[href]"
                );

            if (firstFocusableElement) {
                firstFocusableElement.focus();
            }

            document.body.style.overflow = "hidden";
        }

        function closeModal(modal) {
            if (!modal) return;

            modal.hidden = true;

            document.body.style.overflow = "";

            if (
                previousFocusedElement &&
                typeof previousFocusedElement.focus === "function"
            ) {
                previousFocusedElement.focus();
            }

            activeModal = null;
        }

        modalButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const modalId =
                    button.dataset.modalTarget;

                const modal =
                    document.getElementById(modalId);

                openModal(modal);
            });
        });

        document.addEventListener("click", (event) => {
            const closeButton =
                event.target.closest("[data-modal-close]");

            if (!closeButton) return;

            const modal =
                closeButton.closest(".modal");

            closeModal(modal);
        });

        document.addEventListener("keydown", (event) => {
            if (
                event.key === "Escape" &&
                activeModal
            ) {
                closeModal(activeModal);
            }
        });
    }


    /* =====================================================
       4. FAQ ACCORDION
       ===================================================== */

    function initializeFAQ() {
        const faqItems =
            document.querySelectorAll(".faq-item");

        if (!faqItems.length) return;

        faqItems.forEach((item) => {
            const button =
                item.querySelector(".faq-question");

            const answer =
                item.querySelector(".faq-answer");

            if (!button || !answer) return;

            button.addEventListener("click", () => {
                const isOpen =
                    item.classList.contains("is-open");

                item.classList.toggle(
                    "is-open",
                    !isOpen
                );

                button.setAttribute(
                    "aria-expanded",
                    String(!isOpen)
                );

                answer.hidden = isOpen;
            });
        });
    }


    /* =====================================================
       5. FORM VALIDATION
       ===================================================== */

    function initializeFormValidation() {
        const forms =
            document.querySelectorAll("form[novalidate]");

        if (!forms.length) return;

        forms.forEach((form) => {
            form.addEventListener("submit", (event) => {
                const requiredFields =
                    form.querySelectorAll("[required]");

                let isValid = true;

                requiredFields.forEach((field) => {
                    const value = field.value.trim();

                    field.removeAttribute("aria-invalid");

                    if (!value) {
                        isValid = false;

                        field.setAttribute(
                            "aria-invalid",
                            "true"
                        );
                    }
                });

                if (!isValid) {
                    event.preventDefault();

                    const firstInvalidField =
                        form.querySelector(
                            '[aria-invalid="true"]'
                        );

                    if (firstInvalidField) {
                        firstInvalidField.focus();
                    }
                }
            });
        });
    }


    /* =====================================================
       6. IMAGE SLIDER
       ===================================================== */

    function initializeSliders() {
        const sliders =
            document.querySelectorAll(".image-slider");

        if (!sliders.length) return;

        sliders.forEach((slider) => {
            const slides =
                slider.querySelectorAll(".slide");

            const previousButton =
                slider.querySelector(".slider-previous");

            const nextButton =
                slider.querySelector(".slider-next");

            if (!slides.length) return;

            let currentSlide = 0;

            function showSlide(index) {
                slides.forEach((slide, slideIndex) => {
                    slide.hidden =
                        slideIndex !== index;
                });
            }

            function nextSlide() {
                currentSlide =
                    (currentSlide + 1) % slides.length;

                showSlide(currentSlide);
            }

            function previousSlide() {
                currentSlide =
                    (currentSlide - 1 + slides.length) %
                    slides.length;

                showSlide(currentSlide);
            }

            if (nextButton) {
                nextButton.addEventListener(
                    "click",
                    nextSlide
                );
            }

            if (previousButton) {
                previousButton.addEventListener(
                    "click",
                    previousSlide
                );
            }

            showSlide(currentSlide);
        });
    }


    /* =====================================================
       7. TABS
       ===================================================== */

    function initializeTabs() {
        const tabGroups =
            document.querySelectorAll(".tabs");

        if (!tabGroups.length) return;

        tabGroups.forEach((tabGroup) => {
            const buttons =
                tabGroup.querySelectorAll(
                    '[role="tab"]'
                );

            const panels =
                document.querySelectorAll(
                    '[role="tabpanel"]'
                );

            buttons.forEach((button) => {
                button.addEventListener("click", () => {
                    const panelId =
                        button.getAttribute(
                            "aria-controls"
                        );

                    buttons.forEach((tab) => {
                        const isActive =
                            tab === button;

                        tab.setAttribute(
                            "aria-selected",
                            String(isActive)
                        );
                    });

                    panels.forEach((panel) => {
                        panel.hidden =
                            panel.id !== panelId;
                    });
                });
            });
        });
    }


    /* =====================================================
       8. SEARCH
       ===================================================== */

    function initializeSearch() {
        const searchInputs =
            document.querySelectorAll(
                "[data-search-input]"
            );

        searchInputs.forEach((input) => {
            const targetSelector =
                input.dataset.searchTarget;

            const targetItems =
                document.querySelectorAll(targetSelector);

            if (!targetItems.length) return;

            input.addEventListener("input", () => {
                const searchValue =
                    input.value
                        .trim()
                        .toLowerCase();

                targetItems.forEach((item) => {
                    const itemText =
                        item.textContent.toLowerCase();

                    item.hidden =
                        !itemText.includes(searchValue);
                });
            });
        });
    }


    /* =====================================================
       9. COMPETITION SEARCH & FILTERING
       ===================================================== */

    function initializeCompetitionFiltering() {
        const searchInput =
            document.querySelector("#competition-search");

        const statusFilter =
            document.querySelector("#competition-status");

        const typeFilter =
            document.querySelector("#competition-type");

        const competitionCards =
            document.querySelectorAll(
                ".competition-card"
            );

        const noResults =
            document.querySelector(
                "#no-competition-results"
            );

        if (!competitionCards.length) return;

        function filterCompetitions() {
            const searchValue =
                searchInput
                    ? searchInput.value
                        .trim()
                        .toLowerCase()
                    : "";

            const selectedStatus =
                statusFilter
                    ? statusFilter.value
                    : "all";

            const selectedType =
                typeFilter
                    ? typeFilter.value
                    : "all";

            let visibleCount = 0;

            competitionCards.forEach((card) => {
                const competitionName =
                    card.textContent.toLowerCase();

                const status =
                    card.dataset.status;

                const type =
                    card.dataset.type;

                const matchesSearch =
                    competitionName.includes(searchValue);

                const matchesStatus =
                    selectedStatus === "all" ||
                    status === selectedStatus;

                const matchesType =
                    selectedType === "all" ||
                    type === selectedType;

                const shouldShow =
                    matchesSearch &&
                    matchesStatus &&
                    matchesType;

                card.hidden = !shouldShow;

                if (shouldShow) {
                    visibleCount++;
                }
            });

            if (noResults) {
                noResults.hidden =
                    visibleCount !== 0;
            }
        }

        if (searchInput) {
            searchInput.addEventListener(
                "input",
                filterCompetitions
            );
        }

        if (statusFilter) {
            statusFilter.addEventListener(
                "change",
                filterCompetitions
            );
        }

        if (typeFilter) {
            typeFilter.addEventListener(
                "change",
                filterCompetitions
            );
        }
    }


    /* =====================================================
       10. CREATE COMPETITION
       ===================================================== */

    function initializeCompetitionForm() {
        const form =
            document.querySelector("#competition-form");

        const competitionList =
            document.querySelector("#competition-list");

        if (!form || !competitionList) return;

        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            const name =
                document
                    .querySelector("#competition-name")
                    ?.value
                    .trim();

            const type =
                document
                    .querySelector("#competition-category")
                    ?.value;

            const date =
                document
                    .querySelector("#competition-date")
                    ?.value;

            if (!name || !type || !date) {
                alert(
                    "Please complete all required fields."
                );

                return;
            }

            const newCompetition = {
                id: createId("competition"),
                name,
                type,
                date,
                status: "upcoming",
                teams: 0,
                matches: 0
            };

            try {
                const savedCompetition = await createRemoteRecord(
                    "competitions",
                    newCompetition
                );
                newCompetition.id = savedCompetition.id;
                footballData.competitions.push(newCompetition);
            } catch (error) {
                console.error(error);
                alert("The competition could not be saved.");
                return;
            }

            saveData(footballData);

            renderCompetition(newCompetition);

            form.reset();

            const modal =
                form.closest(".modal");

            if (modal) {
                modal.hidden = true;
                document.body.style.overflow = "";
            }

            updateCompetitionStatistics();
        });
    }


    function renderCompetition(competition) {
        const competitionList =
            document.querySelector("#competition-list");

        if (!competitionList) return;

        const article =
            document.createElement("article");

        article.className = "competition-card";

        article.dataset.status =
            competition.status;

        article.dataset.type =
            competition.type;

        article.innerHTML = `
            <header class="competition-card-header">
                <span class="competition-status">
                    ${escapeHTML(competition.status)}
                </span>

                <p class="competition-type">
                    ${escapeHTML(competition.type)}
                </p>
            </header>

            <h3>
                ${escapeHTML(competition.name)}
            </h3>

            <p>
                Newly created university football competition.
            </p>

            <dl class="competition-information">

                <div>
                    <dt>Teams</dt>
                    <dd>${competition.teams}</dd>
                </div>

                <div>
                    <dt>Matches</dt>
                    <dd>${competition.matches}</dd>
                </div>

                <div>
                    <dt>Start Date</dt>
                    <dd>${escapeHTML(competition.date)}</dd>
                </div>

            </dl>

            <a
                href="#"
                class="competition-link"
            >
                View Competition
            </a>
        `;

        competitionList.appendChild(article);
    }


    /* =====================================================
       11. DYNAMIC COMPETITION STATISTICS
       ===================================================== */

    function updateCompetitionStatistics() {
        const statistics =
            document.querySelectorAll(
                ".statistic-value"
            );

        if (!statistics.length) return;

        const competitions =
            footballData.competitions || [];

        const active =
            competitions.filter(
                (competition) =>
                    competition.status === "active"
            ).length;

        const upcoming =
            competitions.filter(
                (competition) =>
                    competition.status === "upcoming"
            ).length;

        const completed =
            competitions.filter(
                (competition) =>
                    competition.status === "completed"
            ).length;

        if (statistics.length >= 3) {
            statistics[0].textContent = active;
            statistics[1].textContent = upcoming;
            statistics[2].textContent = completed;
        }
    }


    /* =====================================================
       12. GENERAL FILTERING
       ===================================================== */

    function initializeGeneralFilters() {
        const filters =
            document.querySelectorAll("[data-filter]");

        filters.forEach((filter) => {
            filter.addEventListener("change", () => {
                const target =
                    filter.dataset.filterTarget;

                const items =
                    document.querySelectorAll(target);

                const value =
                    filter.value.toLowerCase();

                items.forEach((item) => {
                    const category =
                        (
                            item.dataset.category ||
                            ""
                        ).toLowerCase();

                    item.hidden =
                        value !== "all" &&
                        category !== value;
                });
            });
        });
    }


    /* =====================================================
       13. COUNTDOWN
       ===================================================== */

    function initializeCountdowns() {
        const countdowns =
            document.querySelectorAll(
                "[data-countdown]"
            );

        countdowns.forEach((countdown) => {
            const targetDate =
                new Date(
                    countdown.dataset.countdown
                );

            if (Number.isNaN(targetDate.getTime())) {
                countdown.textContent =
                    "Date unavailable";

                return;
            }

            function updateCountdown() {
                const currentTime = new Date();

                const difference =
                    targetDate - currentTime;

                if (difference <= 0) {
                    countdown.textContent =
                        "Event has started";

                    return;
                }

                const days =
                    Math.floor(
                        difference /
                        (1000 * 60 * 60 * 24)
                    );

                const hours =
                    Math.floor(
                        (difference /
                        (1000 * 60 * 60)) % 24
                    );

                const minutes =
                    Math.floor(
                        (difference /
                        (1000 * 60)) % 60
                    );

                const seconds =
                    Math.floor(
                        (difference / 1000) % 60
                    );

                countdown.textContent =
                    `${days}d ${hours}h ${minutes}m ${seconds}s`;
            }

            updateCountdown();

            setInterval(
                updateCountdown,
                1000
            );
        });
    }


    /* =====================================================
       14. CALCULATOR
       ===================================================== */

    function initializeCalculator() {
        const calculator =
            document.querySelector(".calculator");

        if (!calculator) return;

        const form =
            calculator.querySelector("form");

        const firstInput =
            calculator.querySelector(
                '[name="first-number"]'
            );

        const secondInput =
            calculator.querySelector(
                '[name="second-number"]'
            );

        const operator =
            calculator.querySelector(
                '[name="operator"]'
            );

        const result =
            calculator.querySelector(".calculator-result");

        if (
            !form ||
            !firstInput ||
            !secondInput ||
            !operator ||
            !result
        ) {
            return;
        }

        form.addEventListener("submit", (event) => {
            event.preventDefault();

            const first =
                Number(firstInput.value);

            const second =
                Number(secondInput.value);

            if (
                Number.isNaN(first) ||
                Number.isNaN(second)
            ) {
                result.textContent =
                    "Please enter valid numbers.";

                return;
            }

            let answer;

            switch (operator.value) {
                case "+":
                    answer = first + second;
                    break;

                case "-":
                    answer = first - second;
                    break;

                case "*":
                    answer = first * second;
                    break;

                case "/":
                    if (second === 0) {
                        result.textContent =
                            "Cannot divide by zero.";

                        return;
                    }

                    answer = first / second;
                    break;

                default:
                    result.textContent =
                        "Invalid operation.";

                    return;
            }

            result.textContent =
                `Result: ${answer}`;
        });
    }


    /* =====================================================
       15. DYNAMIC DATA COUNTS
       ===================================================== */

    function updateDataCounts() {
        const countElements =
            document.querySelectorAll(
                "[data-count]"
            );

        countElements.forEach((element) => {
            const type =
                element.dataset.count;

            if (
                Array.isArray(
                    footballData[type]
                )
            ) {
                element.textContent =
                    footballData[type].length;
            }
        });
    }


    function initializeManagementForms() {
        const formConfigurations = [
            {
                formId: "team-form",
                resource: "teams",
                fields: {
                    name: "team-name",
                    faculty: "team-faculty-form",
                    captain: "team-captain"
                },
                defaults: { status: "registered", players: 0 }
            },
            {
                formId: "player-form",
                resource: "players",
                fields: {
                    name: "player-name",
                    team: "player-team-form",
                    position: "player-position-form",
                    jersey: "player-jersey"
                },
                defaults: { status: "active" }
            },
            {
                formId: "result-form",
                resource: "results",
                fields: {
                    competition: "result-competition-form",
                    homeTeam: "home-team",
                    awayTeam: "away-team",
                    homeScore: "home-score",
                    awayScore: "away-score",
                    date: "result-date",
                    venue: "result-venue"
                }
            }
        ];

        formConfigurations.forEach((configuration) => {
            const form = document.getElementById(configuration.formId);
            if (!form) return;

            form.addEventListener("submit", async (event) => {
                event.preventDefault();

                if (!form.checkValidity()) {
                    form.reportValidity();
                    return;
                }

                const getValue = (fieldName) => {
                    const element = document.getElementById(
                        configuration.fields[fieldName]
                    );
                    return element?.value.trim?.() || element?.value || "";
                };

                if (
                    configuration.formId === "result-form" &&
                    getValue("homeTeam") === getValue("awayTeam")
                ) {
                    alert("Home Team and Away Team cannot be the same.");
                    return;
                }

                const record = {
                    ...configuration.defaults,
                    id: createId(configuration.resource.slice(0, -1)),
                    ...Object.fromEntries(
                        Object.keys(configuration.fields).map((fieldName) => [
                            fieldName,
                            getValue(fieldName)
                        ])
                    )
                };

                if (configuration.formId === "result-form") {
                    record.homeScore = Number(record.homeScore);
                    record.awayScore = Number(record.awayScore);
                    record.status = record.homeScore === record.awayScore
                        ? "draw"
                        : record.homeScore > record.awayScore
                            ? "home-win"
                            : "away-win";
                }

                try {
                    const savedRecord = await createRemoteRecord(
                        configuration.resource,
                        record
                    );
                    record.id = savedRecord.id;
                    footballData[configuration.resource].push(record);
                    saveData(footballData);
                    form.reset();
                    form.closest(".modal")?.setAttribute("hidden", "");
                    updateDataCounts();
                    updateCompetitionStatistics();
                    alert("Record saved successfully.");
                } catch (error) {
                    console.error(error);
                    alert("The record could not be saved.");
                }
            });
        });
    }


    /* =====================================================
       INITIALIZE ALL FEATURES
       ===================================================== */

    initializeNavigation();
    initializeDarkMode();
    initializeModals();
    initializeFAQ();
    initializeFormValidation();
    initializeSliders();
    initializeTabs();
    initializeSearch();
    initializeCompetitionFiltering();
    initializeCompetitionForm();
    initializeGeneralFilters();
    initializeCountdowns();
    initializeCalculator();
    initializeManagementForms();
    updateCompetitionStatistics();
    updateDataCounts();
    apiReadyPromise = synchronizeWithApi();

});