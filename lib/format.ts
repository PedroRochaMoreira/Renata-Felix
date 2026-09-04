/** Máscara de CEP brasileira: 00000-000. */
export function formatarCep(value: string) {
  const digitos = value.replace(/\D/g, '').slice(0, 8);
  return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
}
