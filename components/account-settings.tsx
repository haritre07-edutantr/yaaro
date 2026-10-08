'use client';
import {useState} from 'react';
import {KeyRound,Trash2,ChevronRight} from 'lucide-react';
import PasswordDialog from './password-dialog';
export default function AccountSettings(){
 const [open,setOpen]=useState(false),[notice,setNotice]=useState('');
 return <section className="panel account-settings"><header><h2>Account & sign-in</h2><p>Manage your password and account.</p></header><div className="account-action-list"><button type="button" className="account-action" onClick={()=>{setNotice('');setOpen(true);}}><span className="account-action-icon"><KeyRound size={21}/></span><span className="account-action-copy"><b>Change password</b><small>Verify your old password or reset by email</small></span><ChevronRight size={19}/></button><a href="/delete-account" className="account-action account-action-delete"><span className="account-action-icon"><Trash2 size={21}/></span><span className="account-action-copy"><b>Delete account</b><small>Permanently remove your account and personal data</small></span><ChevronRight size={19}/></a></div>{notice&&<p className="password-feedback" role="status">{notice}</p>}{open&&<PasswordDialog onClose={()=>setOpen(false)} onSaved={()=>setNotice('Password updated successfully.')}/>}</section>;
}
