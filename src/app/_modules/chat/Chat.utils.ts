const colors = [
  "#ff6314", // orange
  "#000000", // black
  "#00c079", // mint
  "#004ac0", // blue
  "#ad2acb", // lavender
  "#32a213", // green
];

export const getUserColor = (pseudo: string): string => {
  // Generate a hash from the pseudo
  const hash = pseudo.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  // Use the hash to pick a color
  return colors[Math.abs(hash) % colors.length];
};
