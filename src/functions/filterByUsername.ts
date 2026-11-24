function filterByUsername<T extends { username: string }>(list: T[], query: string): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return list;
  return list.filter((item) => item.username.toLowerCase().includes(needle));
}

export default filterByUsername;
