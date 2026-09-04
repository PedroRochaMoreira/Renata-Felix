import next from 'eslint-config-next';

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'legacy-static/**', 'coverage/**'] },
  ...next,
  {
    rules: {
      // A loja usa <img> em alguns pontos por escolha, não por descuido.
      '@next/next/no-img-element': 'off',
      // Os efeitos que chamam setState aqui leem localStorage e a query string,
      // que só existem no navegador. Ler no corpo do render quebraria a
      // hidratação, então o efeito é justamente o lugar certo para isso.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];

export default config;
