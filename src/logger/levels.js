export const LOG_LEVELS = Object.freeze({
  fatal: 0,
  error: 1,
  warning: 2,
  info: 3,
  http: 4,
  debug: 5,
});

export const LOG_LEVEL_NAMES = Object.keys(LOG_LEVELS);

export const LOG_COLORS = Object.freeze({
  fatal: 'bold white redBG',
  error: 'red',
  warning: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
});
