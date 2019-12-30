import { h, render, Fragment } from "https://unpkg.com/preact@latest?module";
import { useReducer, useEffect } from "https://unpkg.com/preact@latest/hooks/dist/hooks.module.js?module";

// --- Utils ---

let classes = (...classNames) =>
  classNames.filter(x => x).join(" ");

let uid = () =>
  Math.random().toString(36).slice(2, 5);

let maxBy = (items, key) =>
  items.reduce((max, item) => item[key] > max[key] ? item : max);

let saveToLocalStorage = state =>
  localStorage.gameState = JSON.stringify(state);

let loadFromLocalStorage = () =>
  JSON.parse(localStorage.gameState || null);

let scrollIntoView = (selector) => {
  let element = document.querySelector(selector);

  if (element == null) return;

  let { top, left, bottom, right } = element.getBoundingClientRect();

  let isInViewport = (
    top >= 0 &&
    left >= 0 &&
    bottom <= window.innerHeight &&
    right <= window.innerWidth
  );

  if (!isInViewport) {
    element.scrollIntoView();
  }
};

// --- State ---

let initialState = {
  status: "waiting",
  newPlayerName: "",
  selectedPlayerId: null,
  players: [],
  history: [],
  temporaryScore: 0,
  increments: [-1, 1, 5, 10],
  paused: false,
};

let hasEnteredName = ({ newPlayerName }) =>
  newPlayerName.trim() !== "";

let hasPlayers = ({ players }) =>
  players.length > 0;

let isSelectedPlayer = ({ selectedPlayerId }, id) =>
  selectedPlayerId === id;

let hasHighestScore = ({ players }, id) => {
  let player = maxBy(players, "score");
  return player.id === id;
};

let canResetScore = ({ players }) =>
  players.some(player => player.score !== 0);

let reducer = (state, action) => {
  switch (action.type) {
    case "start-game": {
      let startingPlayer = state.players[0];

      return {
        ...state,
        status: "playing",
        selectedPlayerId: state.selectedPlayerId || startingPlayer.id,
      };
    }

    case "load-game": {
      return {
        ...state,
        ...action.state,
        status: "paused",
      };
    }

    case "pause-game": {
      return { ...state, status: "paused" };
    }

    case "reset-game": {
      return initialState;
    }

    case "reset-scores": {
      return {
        ...state,
        players: state.players.map(player => ({ ...player, score: 0 })),
        temporaryScore: 0,
      };
    }

    case "change-score": {
      let players = state.players.map(player => isSelectedPlayer(state, player.id)
        ? { ...player, score: player.score + action.amount }
        : player);

      return {
        ...state,
        players,
        temporaryScore: state.temporaryScore + action.amount,
      };
    }

    case "add-player": {
      let name = state.newPlayerName.trim();

      if (name == "") return state;

      let id = uid();
      let player = { id, name, score: 0 };
      let players = [...state.players, player];

      return {
        ...state,
        players,
        newPlayerName: "",
      };
    }

    case "set-new-player-name": {
      return {
        ...state,
        newPlayerName: action.name,
      };
    }

    case "select-player": {
      let history = state.history;

      if (state.selectedPlayerId === action.id) {
        return state;
      }

      if (state.selectedPlayerId != null) {
        history = [...state.history, {
          player: state.selectedPlayerId,
          score: state.temporaryScore,
        }];
      }

      return {
        ...state,
        selectedPlayerId: action.id,
        temporaryScore: 0,
        history,
      };
    }

    case "select-next-player": {
      let currentIndex = state.players.findIndex(player => {
        return player.id === state.selectedPlayerId;
      });

      let nextIndex = (currentIndex + 1) % state.players.length;
      let nextPlayer = state.players[nextIndex];

      return reducer(state, { type: "select-player", id: nextPlayer.id });
    }

    default:
      console.error("Unhandled action", action);
      return state;
  }
};

// --- Hooks ---

let useKeyListener = (callbacks, deps) => {
  let handler = event => {
    if (event.key in callbacks) {
      callbacks[event.key](event);
    }
  }

  return useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, deps);
}

// --- Components ---

let App = () => {
  let [state, dispatch] = useReducer(reducer, initialState);

  // Load save state when app is mounted
  useEffect(() => {
    let savedState = loadFromLocalStorage();

    if (savedState) {
      dispatch({ type: "load-game", state: savedState });
    }
  }, []);

  // Save before the page is unloaded
  useEffect(() => {
    let handler = () => saveToLocalStorage(state);

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [state]);

  // Make sure the currently selected player is visible
  useEffect(
    () => scrollIntoView(`#player-${state.selectedPlayerId}`),
    [state.selectedPlayerId]
  );

  // Keep the player name input visible as we add more players
  useEffect(
    () => scrollIntoView("#new-player-name"),
    [state.players.length]
  );

  // Keyboard shortcuts
  useKeyListener({
    "Escape": () => dispatch({ type: "pause-game" })
  }, [dispatch]);

  return (
    h(Container, {}, [
      h(ScoreTable, {}, [
        ...state.players.map(player => {
          let isSelected = isSelectedPlayer(state, player.id);
          let isHighScore = hasHighestScore(state, player.id);

          let selectPlayer = () => dispatch({
            type: "select-player",
            id: player.id
          });

          return (
            h(ScoreTableRow, {
              key: player.id,
              id: `player-${player.id}`,
              onClick: selectPlayer,
            }, [
              h(SquareButton, {
                class: "ScoreButton",
                "data-selected": isSelected,
                onClick: selectPlayer,
              }, [
                player.score,

                isSelected && (
                  h(TemporaryScoreButton, {
                    value: state.temporaryScore
                  })
                )
              ]),

              h(PlayerName, {}, player.name),

              h(PopVisibility, { visible: isHighScore }, [
                h(Icon, { name: "crown" }),
              ])
            ])
          );
        }),

        (
          state.status === "waiting-for-players" ||
          state.status === "paused"
        ) && (
          h(ScoreTableRow, {}, [
            h("label", { for: "new-player-name" }, [
              h(SquareButton, {
                id: "add-player",
                disabled: !hasEnteredName(state),
                onClick: () => dispatch({ type: "add-player" }),
              }, [
                h(Icon, { name: "plus" }),
              ]),
            ]),
            h(PlayerNameInput, {
              id: "new-player-name",
              key: "new-player-name",
              placeholder: "Add player",
              value: state.newPlayerName,
              autofocus: true,
              size: 1,
              onInput: event => dispatch({
                type: "set-new-player-name",
                name: event.target.value
              }),
              onBlur: () => dispatch({
                type: "add-player"
              }),
              onKeyUp: (event) => {
                switch (event.key) {
                  case "Enter": return dispatch({ type: "add-player" });
                }
              },
            }),
          ])
        )
      ]),

      h(BottomBar, {}, [
        state.status === "paused" && (
          h(CircleButton, {
            disabled: !hasPlayers(state),
            onClick: () => dispatch({ type: "reset-game" })
          }, [
            h(Icon, { name: "exit" })
          ])
        ),

        (
          state.status === "waiting-for-players" ||
          state.status === "paused"
        ) && (
          h(CircleButton, {
            disabled: !hasPlayers(state),
            onClick: () => dispatch({ type: "start-game" }),
          }, [
            h(Icon, { name: "play" })
          ])
        ),

        state.status === "paused" && (
          h(CircleButton, {
            disabled: !canResetScore(state),
            onClick: () => dispatch({ type: "reset-scores" }),
          }, [
            h(Icon, { name: "reset" })
          ])
        ),

        state.status === "playing" && (
          h(Fragment, {}, [
            ...state.increments.map(amount => (
              h(CircleButton, {
                onClick: () => dispatch({ type: "change-score", amount }),
              }, [
                h(SignedNumber, { value: amount })
              ])
            )),
            h(CircleButton, {
              class: "NextPlayerButton",
              onClick: () => dispatch({ type: "select-next-player" }),
            }, [
              h(Icon, { name: "next" })
            ]),
          ])
        ),
      ]),
    ])
  );
};

let styled = (component, ...classNames) => props =>
  h(component, { ...props, class: classes(...classNames, props.class) });

let Container = styled("div", "Container");
let BottomBar = styled("footer", "BottomBar");
let Button = styled("button", "Button");
let CircleButton = styled(Button, "CircleButton");
let SquareButton = styled(Button, "SquareButton");
let PlayerName = styled("div", "PlayerName");
let PlayerNameInput = styled("input", "PlayerNameInput");
let ScoreTable = styled("div", "ScoreTable");
let ScoreTableRow = styled("div", "ScoreTableRow");

let TemporaryScoreButton = props =>
  h(CircleButton, { class: "TemporaryScoreButton" }, [
    h(SignedNumber, { value: props.value }),
  ]);

let SignedNumber = ({ value }) =>
  h("span", {}, value > 0 ? `+${value}` : `${value}`);

let PopVisibility = ({ visible, children }) =>
  h("div", {
    class: "PopVisibility",
    "data-visible": visible
  }, children);

let Icon = ({ name }) =>
  h("svg", {
    class: "Icon",
    xmlns: "http://www.w3.org/2000/svg",
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    "data-name": name,
  }, [
    h("path", { d: Icon.paths[name] })
  ]);

Icon.paths = {
  "crown": "M3 16l-3-10 7.104 4 4.896-8 4.896 8 7.104-4-3 10h-18zm0 2v4h18v-4h-18z",
  "plus": "M24 10h-10v-10h-4v10h-10v4h10v10h4v-10h10z",
  "next": "M10.573 3.021h7.427v-3.021l6 5.39-6 5.61v-3h-7.427c-3.071 0-5.561 2.356-5.561 5.427 0 3.071 2.489 5.573 5.561 5.573h7.427v5h-7.427c-5.84 0-10.573-4.734-10.573-10.573s4.733-10.406 10.573-10.406z",
  "play": "M21 12l-18 12v-24z",
  "reset": "M13.5 2c-5.621 0-10.211 4.443-10.475 10h-3.025l5 6.625 5-6.625h-2.975c.257-3.351 3.06-6 6.475-6 3.584 0 6.5 2.916 6.5 6.5s-2.916 6.5-6.5 6.5c-1.863 0-3.542-.793-4.728-2.053l-2.427 3.216c1.877 1.754 4.389 2.837 7.155 2.837 5.79 0 10.5-4.71 10.5-10.5s-4.71-10.5-10.5-10.5z",
  "exit": "M24 20.188l-8.315-8.209 8.2-8.282-3.697-3.697-8.212 8.318-8.31-8.203-3.666 3.666 8.321 8.24-8.206 8.313 3.666 3.666 8.237-8.318 8.285 8.203z",
};

// --- Init ---

render(
  h(App),
  document.getElementById("root"),
);
