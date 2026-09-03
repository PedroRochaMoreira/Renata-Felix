export type ProductVariant = { size: string; color: string; stock: number };
export type Product = {
  id: string;
  name: string;
  price: number;
  cat: string;
  color: string;
  img: string;
  images?: string[];
  sizes?: string[];
  tag?: string;
  isNew?: boolean;
  desc: string;
  stock?: number;
  variants?: ProductVariant[];
};
export const products:Product[]=[
 {id:'vestido-celine',name:'Vestido Celine',price:1290,cat:'Vestidos',color:'Preto',tag:'Novo',isNew:true,img:'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=1000&q=85',desc:'Vestido em crepe de alfaiataria com decote preciso e caimento fluido.'},
 {id:'blazer-alba',name:'Blazer Alba',price:1490,cat:'Alfaiataria',color:'Areia',tag:'Exclusivo',isNew:true,img:'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?auto=format&fit=crop&w=1000&q=85',desc:'Blazer de corte reto em lã fria, acabamento interno impecável.'},
 {id:'calca-lina',name:'Calça Lina',price:890,cat:'Alfaiataria',color:'Chocolate',img:'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=1000&q=85',desc:'Calça de cintura alta e pernas amplas em crepe com toque de seda.'},
 {id:'camisa-elis',name:'Camisa Elis',price:690,cat:'Camisas',color:'Off white',tag:'Novo',isNew:true,img:'https://images.unsplash.com/photo-1605763240000-7e93b172d754?auto=format&fit=crop&w=1000&q=85',desc:'Camisa de seda pura com colarinho minimalista.'},
 {id:'tricot-iris',name:'Tricot Íris',price:790,cat:'Tricots',color:'Caramelo',img:'https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?auto=format&fit=crop&w=1000&q=85',desc:'Tricot leve com textura sofisticada para acompanhar a estação.'},
 {id:'saia-maya',name:'Saia Maya',price:740,cat:'Saias',color:'Preto',img:'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=85',desc:'Saia midi de caimento fluido e acabamento minimalista.'},
 {id:'casaco-ambre',name:'Casaco Ambre',price:1890,cat:'Casacos',color:'Areia',tag:'Últimas peças',img:'https://images.unsplash.com/photo-1548126032-079a0fb0099d?auto=format&fit=crop&w=1000&q=85',desc:'Casaco de lã com corte generoso e construção impecável.'},
 {id:'conjunto-aurora',name:'Conjunto Aurora',price:1780,cat:'Alfaiataria',color:'Preto',img:'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1000&q=85',desc:'Conjunto de alfaiataria que combina rigor e movimento.'}
];
export const formatPrice=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
