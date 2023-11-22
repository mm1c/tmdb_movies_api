export const getDateStr = () => {
  const dt = new Date();
  return `${dt.getFullYear()}${dt.getMonth().toString().padStart(2, '0')}${dt.getDate().toString().padStart(2, '0')}`;
}

export const getKeyStr = (searchTerm: string, page: number) => {
  return JSON.stringify({ search_term: searchTerm, page: page });
}