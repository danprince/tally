declare module "https://unpkg.com/preact@latest?module" {
  export function h(
    name: string,
    props?: any,
    children?: VNode[]
  ): VNode;

  export function h<Props>(
    component: Component<Props>,
    props?: Exclude<Props, "children">,
    children?: VNode[],
  ): VNode;

  export type Component<Props> = (props: Props) => VNode;

  type VNode = string | null | any;

  export function render(node: VNode, element: HTMLElement): any;

  export let Fragment: any;
}

declare module "https://unpkg.com/preact@latest/hooks/dist/hooks.module.js?module" {
  export type Reducer<State, Action> =
    (state: State, action: Action) => State;

  export type Dispatcher<Action> =
    (action: Action) => void;

  export function useReducer<State, Action>(
    reducer: Reducer<State, Action>,
    initialState: State,
  ): [State, Dispatcher<Action>];

  type EffectCallback = () => void | (() => void);

  export function useEffect(
    callback: EffectCallback,
    dependencies: any[]
  ): void;
}

declare namespace Tally {
  export type Player = {
    id: string,
    name: string,
    score: number,
  }

  export type Log = {
    player: string,
    score: number,
  }

  export type State = {
    status: "waiting" | "playing" | "paused",
    newPlayerName: string,
    selectedPlayerId: string | null,
    players: Player[],
    history: Log[],
    temporaryScore: number,
    increments: number[],
    paused: boolean,
  }

  export type Action =
    | { type: "reset-scores" }
    | { type: "start-game" }
    | { type: "load-game", state: State }
    | { type: "pause-game" }
    | { type: "reset-game" }
    | { type: "change-score", amount: number }
    | { type: "select-next-player" }
    | { type: "select-player", id: string }
    | { type: "add-player" }
    | { type: "set-new-player-name", name: string }
}
