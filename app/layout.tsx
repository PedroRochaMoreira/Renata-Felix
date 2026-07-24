import './globals.css'; import type { Metadata } from 'next'; import {StoreProvider} from './store';
export const metadata:Metadata={title:'Renata Felix — Essenciais que permanecem',description:'Moda feminina contemporânea.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body><StoreProvider>{children}</StoreProvider></body></html>}
