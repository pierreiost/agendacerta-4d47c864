/**
 * Masks for Brazilian documents and phone numbers
 */

/**
 * Format CPF: 000.000.000-00
 */
export function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/**
 * Format CNPJ: 00.000.000/0000-00
 */
export function maskCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

/**
 * Format CPF or CNPJ based on input length
 * CPF: 000.000.000-00 (11 digits)
 * CNPJ: 00.000.000/0000-00 (14 digits)
 */
export function maskCPFCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '');
  
  if (digits.length <= 11) {
    return maskCPF(value);
  }
  return maskCNPJ(value);
}

/**
 * Format phone number: (00) 00000-0000 or (00) 0000-0000
 */
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Remove all non-digit characters
 */
export function unmask(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Validate CPF
 */
export function isValidCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits[9])) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits[10])) return false;
  
  return true;
}

/**
 * Validate CNPJ
 */
export function isValidCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i]) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(digits[12])) return false;
  
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(digits[i]) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (digit2 !== parseInt(digits[13])) return false;
  
  return true;
}

/**
 * Validate CPF or CNPJ
 */
export function isValidCPFCNPJ(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  
  if (digits.length === 11) return isValidCPF(value);
  if (digits.length === 14) return isValidCNPJ(value);
  
  return false;
}

/**
 * Format phone for public pages with progressive mask (up to 13 digits)
 * - Up to 9 digits: 98125-9200
 * - 10-11 digits: (53) 98125-9200
 * - 12-13 digits: +55 (53) 98125-9200
 */
export function maskPhonePublic(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 13);

  if (digits.length === 0) return '';

  // 12-13 digits: DDI + DDD + number
  if (digits.length >= 12) {
    const ddi = digits.slice(0, 2);
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(4);
    if (rest.length <= 4) return `+${ddi} (${ddd}) ${rest}`;
    if (rest.length <= 8) return `+${ddi} (${ddd}) ${rest.slice(0, rest.length - 4)}-${rest.slice(rest.length - 4)}`;
    return `+${ddi} (${ddd}) ${rest.slice(0, rest.length - 4)}-${rest.slice(rest.length - 4)}`;
  }

  // 10-11 digits: DDD + number
  if (digits.length >= 10) {
    const ddd = digits.slice(0, 2);
    const rest = digits.slice(2);
    if (rest.length <= 4) return `(${ddd}) ${rest}`;
    return `(${ddd}) ${rest.slice(0, rest.length - 4)}-${rest.slice(rest.length - 4)}`;
  }

  // Up to 9 digits: just number
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, digits.length - 4)}-${digits.slice(digits.length - 4)}`;
}

/**
 * Format CEP: 00000-000
 */
export function maskCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}
export function maskCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}
