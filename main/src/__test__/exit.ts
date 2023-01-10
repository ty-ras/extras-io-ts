export const exitCodes: Array<number> = [];
export const exit = (exitCode: number) => {
  exitCodes.push(exitCode);
};
