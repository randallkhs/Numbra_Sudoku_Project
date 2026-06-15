export const LOCAL_SNARK_STORAGE_KEY = 'sudoku_ai_snarks';

export const loadSnarks = (): string[] => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(LOCAL_SNARK_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
  }
  return [];
};

export const saveSnark = (text: string) => {
  if (typeof window !== 'undefined') {
    const snarks = loadSnarks();
    if (!snarks.includes(text)) {
      snarks.push(text);
      localStorage.setItem(LOCAL_SNARK_STORAGE_KEY, JSON.stringify(snarks));
    }
  }
};

export const getRandomSnark = () => {
  const snarks = loadSnarks();
  if (snarks.length > 0) {
    return snarks[Math.floor(Math.random() * snarks.length)];
  }
  return null;
};
