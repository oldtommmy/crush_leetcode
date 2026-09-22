export function createSingleFlight<Args extends unknown[], Result>(
  task: (...args: Args) => Promise<Result>
): (...args: Args) => Promise<Result> {
  let inFlight: Promise<Result> | undefined;
  return (...args: Args) => {
    if (inFlight) return inFlight;
    const request = task(...args).finally(() => {
      if (inFlight === request) inFlight = undefined;
    });
    inFlight = request;
    return request;
  };
}
