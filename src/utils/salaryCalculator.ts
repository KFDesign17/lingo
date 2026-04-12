interface WorkCalculation {
  totalHours: number;
  basePay: number;
  night10Pay: number;
  night30Pay: number;
  totalGross: number;
}

// Fonction utilitaire pour convertir "HH:mm" en minutes depuis minuit
const timeToMin = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export const calculateSalary = (
  startTime: string, 
  endTime: string, 
  settings: any
): WorkCalculation => {
  const { rate, maj10, maj10Start, maj10End, maj30, maj30Start, maj30End } = settings;
  
  const BASE_RATE = rate;
  const NIGHT_10_RATE = BASE_RATE * (1 + maj10 / 100);
  const NIGHT_30_RATE = BASE_RATE * (1 + maj30 / 100);

  let startMin = timeToMin(startTime);
  let endMin = timeToMin(endTime);

  if (endMin <= startMin) endMin += 24 * 60; // Gestion du passage à minuit

  const m10S = timeToMin(maj10Start);
  let m10E = timeToMin(maj10End);
  const m30S = timeToMin(maj30Start);
  let m30E = timeToMin(maj30End);

  // Ajustement des tranches si elles traversent minuit
  if (m10E <= m10S) m10E += 24 * 60;
  if (m30E <= m30S) m30E += 24 * 60;

  let pay = 0;
  let n10Min = 0;
  let n30Min = 0;
  let normalMin = 0;

  for (let m = startMin; m < endMin; m++) {
    const current = m % (24 * 60);
    const currentPlusNextDay = current + 24 * 60;

    // On vérifie si la minute actuelle est dans la tranche 30%
    if ((current >= m30S && current < m30E) || (currentPlusNextDay >= m30S && currentPlusNextDay < m30E)) {
      pay += NIGHT_30_RATE / 60;
      n30Min++;
    } 
    // Sinon dans la tranche 10%
    else if ((current >= m10S && current < m10E) || (currentPlusNextDay >= m10S && currentPlusNextDay < m10E)) {
      pay += NIGHT_10_RATE / 60;
      n10Min++;
    } 
    // Sinon taux normal
    else {
      pay += BASE_RATE / 60;
      normalMin++;
    }
  }

  return {
    totalHours: (endMin - startMin) / 60,
    basePay: (normalMin / 60) * BASE_RATE,
    night10Pay: (n10Min / 60) * NIGHT_10_RATE,
    night30Pay: (n30Min / 60) * NIGHT_30_RATE,
    totalGross: pay
  };
};