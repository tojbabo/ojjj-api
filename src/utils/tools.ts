export function CheckTimeParam(time:string):boolean{
    if (!/^\d{12}$/.test(time)) return false;

    const year = parseInt(time.slice(0, 4));
    const month = parseInt(time.slice(4, 6));
    const day = parseInt(time.slice(6, 8));
    const hour = parseInt(time.slice(8, 10));
    const min = parseInt(time.slice(10, 12));

    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    if (hour < 0 || hour > 23) return false;
    if (min < 0 || min > 59) return false;


    return true;
}

/** 다음 10분 정각까지 남은 ms */
export function GetNextTenMin(): number {
  const now = new Date();
  const next = new Date(now);
  next.setMinutes(Math.ceil(now.getMinutes() / 10) * 10, 0, 0);
  if (next <= now) next.setMinutes(next.getMinutes() + 10);
  return next.getTime() - now.getTime();
}

/** 다음 정시(00분)까지 남은 ms */
export function GetNextHour(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(now.getHours() + 1, 0, 0, 0);
  return next.getTime() - now.getTime();
}