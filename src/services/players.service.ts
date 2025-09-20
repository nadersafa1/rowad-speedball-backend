// Public Interface
export const playersService = {
  calculateAge: (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  },
  getAgeGroup: (dateOfBirth: string): string => {
    const age = playersService.calculateAge(dateOfBirth);

    if (age < 7) return "Mini";
    if (age < 9) return "U-09";
    if (age < 11) return "U-11";
    if (age < 13) return "U-13";
    if (age < 15) return "U-15";
    if (age < 17) return "U-17";
    if (age < 19) return "U-19";
    if (age < 21) return "U-21";
    return "Seniors";
  },
};
