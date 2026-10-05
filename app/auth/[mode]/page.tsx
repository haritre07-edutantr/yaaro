import Auth from '@/components/auth';
export default async function Page({params}:{params:Promise<{mode:string}>}){const {mode}=await params;return <Auth mode={mode}/>;}
