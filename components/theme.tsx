'use client';
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {Moon,Sun} from 'lucide-react';
const ThemeContext=createContext({dark:false,toggle:()=>{}});
export function ThemeProvider({children}:{children:ReactNode}){
 const [dark,setDark]=useState(false);
 useEffect(()=>{const system=matchMedia('(prefers-color-scheme: dark)');const apply=()=>{let saved:string|null=null;try{saved=localStorage.getItem('yaaro:theme');}catch{}const value=saved==='dark'||saved!=='light'&&system.matches;setDark(value);document.documentElement.dataset.theme=value?'dark':'light';};apply();system.addEventListener('change',apply);const sync=(event:StorageEvent)=>{if(event.key==='yaaro:theme')apply();};window.addEventListener('storage',sync);return()=>{system.removeEventListener('change',apply);window.removeEventListener('storage',sync);};},[]);
 function toggle(){const value=!dark;setDark(value);document.documentElement.dataset.theme=value?'dark':'light';try{localStorage.setItem('yaaro:theme',value?'dark':'light');}catch{}}
 return <ThemeContext.Provider value={{dark,toggle}}>{children}</ThemeContext.Provider>;
}
export function ThemeControl(){const {dark,toggle}=useContext(ThemeContext);return <button type="button" className="icon-button theme-control" onClick={toggle} aria-label={dark?'Switch to light mode':'Switch to dark mode'} title={dark?'Switch to light mode':'Switch to dark mode'} aria-pressed={dark}>{dark?<Sun size={20}/>:<Moon size={20}/>}</button>;}
