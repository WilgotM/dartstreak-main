export type DartKind = "S" | "D" | "T" | "SB" | "DB";

export interface DartOption {
  kind: DartKind;
  value: number;
  score: number;
  label: string;
  isDouble: boolean;
  easeWeight: number;
}

const buildDartOptions = (): DartOption[] => {
  const options: DartOption[] = [];

  for (let value = 1; value <= 20; value += 1) {
    options.push({
      kind: "S",
      value,
      score: value,
      label: `S${value}`,
      isDouble: false,
      easeWeight: 1,
    });
    options.push({
      kind: "D",
      value,
      score: value * 2,
      label: `D${value}`,
      isDouble: true,
      easeWeight: 3,
    });
    options.push({
      kind: "T",
      value,
      score: value * 3,
      label: `T${value}`,
      isDouble: false,
      easeWeight: 5,
    });
  }

  options.push({
    kind: "SB",
    value: 25,
    score: 25,
    label: "25",
    isDouble: false,
    easeWeight: 2,
  });

  options.push({
    kind: "DB",
    value: 50,
    score: 50,
    label: "BULL",
    isDouble: true,
    easeWeight: 4,
  });

  return options;
};

const DART_OPTIONS = buildDartOptions();

const routeEase = (route: DartOption[]): number => route.reduce((sum, option) => sum + option.easeWeight, 0);

const routeSingles = (route: DartOption[]): number =>
  route.reduce((sum, option) => sum + (option.kind === "S" || option.kind === "SB" ? 1 : 0), 0);

export const findCheckoutRoutes = ({
  currentTotal,
  target,
  dartsLeft,
  finishOnDouble,
}: {
  currentTotal: number;
  target: number;
  dartsLeft: number;
  finishOnDouble: boolean;
}): DartOption[][] => {
  if (dartsLeft <= 0 || currentTotal >= target) return [];

  const routes: DartOption[][] = [];

  const dfs = (runningTotal: number, used: number, path: DartOption[]) => {
    if (used >= dartsLeft) return;

    for (const option of DART_OPTIONS) {
      const nextTotal = runningTotal + option.score;
      if (nextTotal > target) continue;

      const nextPath = [...path, option];
      if (nextTotal === target) {
        if (!finishOnDouble || option.isDouble) {
          routes.push(nextPath);
        }
        continue;
      }

      dfs(nextTotal, used + 1, nextPath);
    }
  };

  dfs(currentTotal, 0, []);
  return routes;
};

export const pickEasiestRoute = (routes: DartOption[][]): DartOption[] | null => {
  if (routes.length === 0) return null;

  const sorted = [...routes].sort((a, b) => {
    const easeA = routeEase(a);
    const easeB = routeEase(b);
    if (easeA !== easeB) return easeA - easeB;

    const singlesA = routeSingles(a);
    const singlesB = routeSingles(b);
    if (singlesA !== singlesB) return singlesB - singlesA;

    return a.length - b.length;
  });

  return sorted[0];
};

export const pickFastestRoute = (routes: DartOption[][]): DartOption[] | null => {
  if (routes.length === 0) return null;

  const sorted = [...routes].sort((a, b) => {
    if (a.length !== b.length) return a.length - b.length;

    const easeA = routeEase(a);
    const easeB = routeEase(b);
    return easeA - easeB;
  });

  return sorted[0];
};

export const formatRoute = (route: DartOption[] | null): string | null => {
  if (!route || route.length === 0) return null;
  return route.map((option) => option.label).join(" + ");
};
