'use client';
export default function Error({reset}:{reset:()=>void}){return <main className="access-page"><h1>A little pause in the conversation.</h1><p>We couldn’t load this page. Try again when you’re connected.</p><button onClick={reset} className="button primary">Try again</button><a href="/">YAARO Home</a></main>}
