/* =========================================================
   University Football Management
   Main JavaScript
   Vanilla JavaScript
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       MOBILE NAVIGATION
       ===================================================== */

    const navigationToggle =
        document.querySelector(".navigation-toggle");

    const navigationMenu =
        document.querySelector(".navigation-menu");

    if (navigationToggle && navigationMenu) {

        const closeNavigation = () => {

            navigationMenu.classList.remove("is-open");

            navigationToggle.setAttribute(
                "aria-expanded",
                "false"
            );

            navigationToggle.setAttribute(
                "aria-label",
                "Open navigation menu"
            );
        };

        const openNavigation = () => {

            navigationMenu.classList.add("is-open");

            navigationToggle.setAttribute(
                "aria-expanded",
                "true"
            );

            navigationToggle.setAttribute(
                "aria-label",
                "Close navigation menu"
            );
        };

        navigationToggle.addEventListener("click", () => {

            const isOpen =
                navigationMenu.classList.contains("is-open");

            if (isOpen) {
                closeNavigation();
            } else {
                openNavigation();
            }

        });

        navigationMenu.addEventListener("click", (event) => {

            const link =
                event.target.closest("a");

            if (link) {
                closeNavigation();
            }

        });

        document.addEventListener("keydown", (event) => {

            if (event.key === "Escape") {
                closeNavigation();
            }

        });

        document.addEventListener("click", (event) => {

            const clickedInsideNavigation =
                navigationMenu.contains(event.target);

            const clickedToggle =
                navigationToggle.contains(event.target);

            if (
                navigationMenu.classList.contains("is-open") &&
                !clickedInsideNavigation &&
                !clickedToggle
            ) {
                closeNavigation();
            }

        });

        window.addEventListener("resize", () => {

            if (window.innerWidth >= 900) {
                closeNavigation();
            }

        });

    }


    /* =====================================================
       DARK MODE
       ===================================================== */

    try {

        const savedTheme =
            localStorage.getItem("ufm-theme");

        if (savedTheme === "dark") {

            document.documentElement.classList.add(
                "dark-mode"
            );

        }

    } catch (error) {

        console.warn(
            "Theme preference could not be loaded.",
            error
        );

    }


    /* =====================================================
       FOOTBALL DATA
       ===================================================== */

    const defaultFootballData = {

        competitions: [],
        teams: [],
        players: [],
        fixtures: [],
        results: [],
        notifications: []

    };


    const loadFootballData = () => {

        try {

            const storedData =
                localStorage.getItem("ufm-data");

            if (!storedData) {

                localStorage.setItem(
                    "ufm-data",
                    JSON.stringify(defaultFootballData)
                );

                return {
                    ...defaultFootballData
                };

            }

            const parsedData =
                JSON.parse(storedData);

            return {

                competitions:
                    Array.isArray(parsedData.competitions)
                        ? parsedData.competitions
                        : [],

                teams:
                    Array.isArray(parsedData.teams)
                        ? parsedData.teams
                        : [],

                players:
                    Array.isArray(parsedData.players)
                        ? parsedData.players
                        : [],

                fixtures:
                    Array.isArray(parsedData.fixtures)
                        ? parsedData.fixtures
                        : [],

                results:
                    Array.isArray(parsedData.results)
                        ? parsedData.results
                        : [],

                notifications:
                    Array.isArray(parsedData.notifications)
                        ? parsedData.notifications
                        : []

            };

        } catch (error) {

            console.warn(
                "Football data could not be loaded.",
                error
            );

            return {
                ...defaultFootballData
            };

        }

    };


    let footballData =
        loadFootballData();


    /* =====================================================
       STATISTICS
       ===================================================== */

    const updateStatistics = () => {

        const statisticValues =
            document.querySelectorAll(
                ".statistic-value"
            );

        if (!statisticValues.length) {
            return;
        }


        /*
         * HOME PAGE
         * -----------------------------------------------
         * The Home page uses four statistic cards:
         *
         * 1. Active Competitions
         * 2. Registered Teams
         * 3. Matches Played
         * 4. Upcoming Matches
         */

        const activeCompetitions =
            footballData.competitions.filter(
                competition =>
                    competition.status === "active"
            ).length;


        const registeredTeams =
            footballData.teams.length;


        const matchesPlayed =
            footballData.results.length;


        const currentDate =
            new Date();


        const upcomingMatches =
            footballData.fixtures.filter(fixture => {

                if (!fixture.date) {
                    return false;
                }

                return new Date(fixture.date) >= currentDate;

            }).length;


        /*
         * If the page contains specifically named
         * statistics, update those first.
         */

        const namedStatistics = {

            "registered-teams":
                registeredTeams,

            "active-teams":
                footballData.teams.filter(
                    team => team.status === "active"
                ).length,

            "participating-teams":
                footballData.teams.filter(
                    team => team.status === "participating"
                ).length,

            "team-players":
                footballData.players.length,

            "registered-players":
                footballData.players.length,

            "active-players":
                footballData.players.filter(
                    player => player.status === "active"
                ).length,

            "player-teams":
                new Set(
                    footballData.players
                        .map(player => player.team)
                        .filter(Boolean)
                ).size,

            "competition-players":
                footballData.players.length,

            "completed-matches":
                footballData.results.length,

            "matches-today":
                getMatchesToday(),

            "home-wins":
                getHomeWins(),

            "away-wins":
                getAwayWins()

        };


        Object.entries(namedStatistics).forEach(
            ([name, value]) => {

                const element =
                    document.querySelector(
                        `[data-statistic="${name}"]`
                    );

                if (element) {
                    element.textContent = value;
                }

            }
        );


        /*
         * Home page fallback.
         */

        if (
            !document.querySelector(
                '[data-statistic="completed-matches"]'
            ) &&
            statisticValues.length >= 4
        ) {

            statisticValues[0].textContent =
                activeCompetitions;

            statisticValues[1].textContent =
                registeredTeams;

            statisticValues[2].textContent =
                matchesPlayed;

            statisticValues[3].textContent =
                upcomingMatches;

        }

    };


    /* =====================================================
       RESULT STATISTICS
       ===================================================== */

    const getMatchesToday = () => {

        const today =
            new Date();

        const todayString =
            today.toISOString().split("T")[0];


        return footballData.results.filter(result => {

            return result.date === todayString;

        }).length;

    };


    const getHomeWins = () => {

        return footballData.results.filter(result => {

            const homeScore =
                Number(result.homeScore);

            const awayScore =
                Number(result.awayScore);

            return homeScore > awayScore;

        }).length;

    };


    const getAwayWins = () => {

        return footballData.results.filter(result => {

            const homeScore =
                Number(result.homeScore);

            const awayScore =
                Number(result.awayScore);

            return awayScore > homeScore;

        }).length;

    };


    updateStatistics();


    /* =====================================================
       DARK MODE TOGGLE
       ===================================================== */

    const themeToggle =
        document.querySelector(".theme-toggle");

    if (themeToggle) {

        const updateThemeButton = () => {

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

        };


        themeToggle.addEventListener("click", () => {

            const isDark =
                document.documentElement.classList.toggle(
                    "dark-mode"
                );

            try {

                localStorage.setItem(
                    "ufm-theme",
                    isDark ? "dark" : "light"
                );

            } catch (error) {

                console.warn(
                    "Theme preference could not be saved.",
                    error
                );

            }

            updateThemeButton();

        });


        updateThemeButton();

    }


    /* =====================================================
       RESULTS SEARCH AND FILTER
       ===================================================== */

    const resultList =
        document.querySelector("#result-list");

    const resultSearch =
        document.querySelector("#result-search");

    const resultCompetition =
        document.querySelector("#result-competition");

    const resultStatus =
        document.querySelector("#result-status");

    const noResults =
        document.querySelector("#no-result-results");


    const filterResults = () => {

        if (!resultList) {
            return;
        }


        const cards =
            resultList.querySelectorAll(
                ".competition-card"
            );


        const searchTerm =
            resultSearch
                ? resultSearch.value
                    .trim()
                    .toLowerCase()
                : "";


        const selectedCompetition =
            resultCompetition
                ? resultCompetition.value
                : "all";


        const selectedStatus =
            resultStatus
                ? resultStatus.value
                : "all";


        let visibleResults = 0;


        cards.forEach(card => {

            const cardText =
                card.textContent.toLowerCase();


            const cardCompetition =
                card.dataset.competition || "";


            const cardStatus =
                card.dataset.status || "";


            const matchesSearch =
                !searchTerm ||
                cardText.includes(searchTerm);


            const matchesCompetition =
                selectedCompetition === "all" ||
                cardCompetition === selectedCompetition;


            const matchesStatus =
                selectedStatus === "all" ||
                cardStatus === selectedStatus;


            const shouldShow =
                matchesSearch &&
                matchesCompetition &&
                matchesStatus;


            if (shouldShow) {

                card.hidden = false;

                visibleResults++;

            } else {

                card.hidden = true;

            }

        });


        if (noResults) {

            noResults.hidden =
                visibleResults !== 0;

        }

    };


    if (resultSearch) {

        resultSearch.addEventListener(
            "input",
            filterResults
        );

    }


    if (resultCompetition) {

        resultCompetition.addEventListener(
            "change",
            filterResults
        );

    }


    if (resultStatus) {

        resultStatus.addEventListener(
            "change",
            filterResults
        );

    }


    filterResults();


    /* =====================================================
       MODAL SYSTEM
       ===================================================== */

    const modalOpenButtons =
        document.querySelectorAll(
            "[data-modal-target]"
        );


    const modalCloseButtons =
        document.querySelectorAll(
            "[data-modal-close]"
        );


    const openModal = (modal) => {

        if (!modal) {
            return;
        }

        modal.hidden = false;

        document.body.classList.add(
            "modal-open"
        );

        const firstInput =
            modal.querySelector(
                "input, select, textarea, button"
            );

        if (firstInput) {
            firstInput.focus();
        }

    };


    const closeModal = (modal) => {

        if (!modal) {
            return;
        }

        modal.hidden = true;

        document.body.classList.remove(
            "modal-open"
        );

    };


    modalOpenButtons.forEach(button => {

        button.addEventListener("click", () => {

            const modalId =
                button.dataset.modalTarget;

            const modal =
                document.getElementById(modalId);

            openModal(modal);

        });

    });


    modalCloseButtons.forEach(button => {

        button.addEventListener("click", () => {

            const modal =
                button.closest(".modal");

            closeModal(modal);

        });

    });


    document.addEventListener("keydown", event => {

        if (event.key !== "Escape") {
            return;
        }


        const openModalElement =
            document.querySelector(
                ".modal:not([hidden])"
            );


        if (openModalElement) {
            closeModal(openModalElement);
        }

    });


    /* =====================================================
       RESULT FORM
       ===================================================== */

    const resultForm =
        document.querySelector("#result-form");


    if (resultForm) {

        resultForm.addEventListener(
            "submit",
            event => {

                event.preventDefault();


                const competition =
                    document.querySelector(
                        "#result-competition-form"
                    );


                const homeTeam =
                    document.querySelector(
                        "#home-team"
                    );


                const awayTeam =
                    document.querySelector(
                        "#away-team"
                    );


                const homeScore =
                    document.querySelector(
                        "#home-score"
                    );


                const awayScore =
                    document.querySelector(
                        "#away-score"
                    );


                const resultDate =
                    document.querySelector(
                        "#result-date"
                    );


                const venue =
                    document.querySelector(
                        "#result-venue"
                    );


                if (
                    !competition ||
                    !homeTeam ||
                    !awayTeam ||
                    !homeScore ||
                    !awayScore ||
                    !resultDate ||
                    !venue
                ) {
                    return;
                }


                if (
                    !resultForm.checkValidity()
                ) {

                    resultForm.reportValidity();

                    return;

                }


                if (
                    homeTeam.value === awayTeam.value
                ) {

                    alert(
                        "Home Team and Away Team cannot be the same."
                    );

                    return;

                }


                const homeScoreValue =
                    Number(homeScore.value);


                const awayScoreValue =
                    Number(awayScore.value);


                let status =
                    "draw";


                if (
                    homeScoreValue >
                    awayScoreValue
                ) {

                    status = "home-win";

                } else if (
                    awayScoreValue >
                    homeScoreValue
                ) {

                    status = "away-win";

                }


                const result = {

                    id:
                        Date.now(),

                    competition:
                        competition.value,

                    homeTeam:
                        homeTeam.options[
                            homeTeam.selectedIndex
                        ].text,

                    awayTeam:
                        awayTeam.options[
                            awayTeam.selectedIndex
                        ].text,

                    homeScore:
                        homeScoreValue,

                    awayScore:
                        awayScoreValue,

                    date:
                        resultDate.value,

                    venue:
                        venue.value,

                    status:
                        status

                };


                footballData.results.push(
                    result
                );


                try {

                    localStorage.setItem(
                        "ufm-data",
                        JSON.stringify(
                            footballData
                        )
                    );

                } catch (error) {

                    console.error(
                        "Result could not be saved.",
                        error
                    );

                    alert(
                        "The result could not be saved."
                    );

                    return;

                }


                alert(
                    "Match result saved successfully."
                );


                resultForm.reset();


                const modal =
                    resultForm.closest(".modal");

                closeModal(modal);


                updateStatistics();

            }
        );

    }


    /* =====================================================
       PREVENT EMPTY # LINKS FROM JUMPING TO TOP
       ===================================================== */

    const emptyLinks =
        document.querySelectorAll(
            'a[href="#"]'
        );


    emptyLinks.forEach(link => {

        link.addEventListener("click", event => {

            event.preventDefault();

        });

    });


});