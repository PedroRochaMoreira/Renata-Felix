import { describe, expect, it } from 'vitest';
import type { Product } from '../app/data';
import { filterProducts, parseOrder, shopFacets, shopHref, sortProducts } from '../lib/shop-filters';

function peca(overrides: Partial<Product> & Pick<Product, 'id' | 'name' | 'price' | 'cat' | 'color'>): Product {
  return { img: 'foto.jpg', desc: 'peça', ...overrides };
}

const catalogo: Product[] = [
  peca({
    id: 'a',
    name: 'Vestido Celine',
    price: 1290,
    cat: 'Vestidos',
    color: 'Preto',
    isNew: true,
    variants: [
      { size: 'P', color: 'Preto', stock: 0 },
      { size: 'M', color: 'Preto', stock: 2 },
    ],
  }),
  peca({
    id: 'b',
    name: 'Blazer Alba',
    price: 690,
    cat: 'Alfaiataria',
    color: 'Areia',
    variants: [{ size: 'P', color: 'Areia', stock: 4 }],
  }),
  peca({
    id: 'c',
    name: 'Camisa Elis',
    price: 2000,
    cat: 'Camisas',
    color: 'Preto',
    variants: [{ size: 'M', color: 'Preto', stock: 0 }],
  }),
];

describe('filterProducts', () => {
  it('sem filtro devolve o catálogo inteiro', () => {
    expect(filterProducts(catalogo, {})).toHaveLength(3);
  });

  it('filtra por categoria e por novidade', () => {
    expect(filterProducts(catalogo, { categoria: 'Vestidos' }).map(p => p.id)).toEqual(['a']);
    expect(filterProducts(catalogo, { filtro: 'novidades' }).map(p => p.id)).toEqual(['a']);
  });

  it('não oferece um tamanho que está esgotado', () => {
    expect(filterProducts(catalogo, { tamanho: 'M' }).map(p => p.id)).toEqual(['a']);
    expect(filterProducts(catalogo, { tamanho: 'P' }).map(p => p.id)).toEqual(['b']);
  });

  it('cruza tamanho e cor pela variante, não pela peça', () => {
    expect(filterProducts(catalogo, { tamanho: 'M', cor: 'Preto' }).map(p => p.id)).toEqual(['a']);
    expect(filterProducts(catalogo, { tamanho: 'P', cor: 'Preto' })).toHaveLength(0);
  });

  it('respeita o teto de preço', () => {
    expect(filterProducts(catalogo, { precoMax: '1000' }).map(p => p.id)).toEqual(['b']);
    expect(filterProducts(catalogo, { precoMax: 'nao-numero' })).toHaveLength(3);
  });

  it('ignora cor sem nenhuma peça disponível', () => {
    expect(filterProducts(catalogo, { cor: 'Verde' })).toHaveLength(0);
  });
});

describe('sortProducts', () => {
  it('ordena por preço nos dois sentidos', () => {
    expect(sortProducts(catalogo, 'menor-preco').map(p => p.id)).toEqual(['b', 'a', 'c']);
    expect(sortProducts(catalogo, 'maior-preco').map(p => p.id)).toEqual(['c', 'a', 'b']);
  });

  it('ordena por nome respeitando o português', () => {
    expect(sortProducts(catalogo, 'nome').map(p => p.name)).toEqual(['Blazer Alba', 'Camisa Elis', 'Vestido Celine']);
  });

  it('coloca as novidades na frente por padrão', () => {
    expect(sortProducts(catalogo, 'recentes')[0].id).toBe('a');
  });

  it('não altera a lista recebida', () => {
    const antes = catalogo.map(p => p.id);
    sortProducts(catalogo, 'maior-preco');
    expect(catalogo.map(p => p.id)).toEqual(antes);
  });
});

describe('shopFacets', () => {
  it('oferece apenas tamanhos e cores com estoque, na ordem de manequim', () => {
    const facets = shopFacets(catalogo);
    expect(facets.sizes).toEqual(['P', 'M']);
    expect(facets.colors).toEqual(['Areia', 'Preto']);
    expect(facets.categories).toEqual(['Alfaiataria', 'Camisas', 'Vestidos']);
    expect(facets.maxPrice).toBe(2000);
  });
});

describe('shopHref', () => {
  it('preserva os demais filtros e descarta os vazios', () => {
    expect(shopHref({ categoria: 'Vestidos' }, { tamanho: 'M' })).toBe('/loja?categoria=Vestidos&tamanho=M');
    expect(shopHref({ categoria: 'Vestidos', tamanho: 'M' }, { tamanho: '' })).toBe('/loja?categoria=Vestidos');
    expect(shopHref({}, {})).toBe('/loja');
  });
});

describe('parseOrder', () => {
  it('recai no padrão diante de valor desconhecido', () => {
    expect(parseOrder('menor-preco')).toBe('menor-preco');
    expect(parseOrder('qualquer-coisa')).toBe('recentes');
    expect(parseOrder(undefined)).toBe('recentes');
  });
});
