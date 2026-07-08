const API_URL="https://script.google.com/macros/s/AKfycbyFZrJEXsqktYS-Eamf4X1B7b-MJk-86aw-sYLhiCBv3636XDATjwQqf2YI6Q2mFrnzYw/exec";

document.addEventListener("DOMContentLoaded",loadPost);

function loadPost(){
  const id=new URLSearchParams(location.search).get("id");

  if(!id){
    postContainer.innerHTML=`<span class="tag">Post</span><h2>Post not found</h2><p>No post ID was provided.</p><a href="index.html" class="btn">Back to Home</a>`;
    return;
  }

  fetch(API_URL+"?action=getPosts")
    .then(r=>r.json())
    .then(data=>{
      const p=normalizePosts(data.posts||[]).find(x=>String(x.id)===String(id));

      if(!p){
        postContainer.innerHTML=`<span class="tag">Post</span><h2>Post not found</h2><p>The post may have been deleted.</p><a href="index.html" class="btn">Back to Home</a>`;
        return;
      }

      postContainer.innerHTML=`
        <span class="tag">${esc(p.type)}</span>
        <div class="date">${fmtDate(p.dateObj)}</div>
        ${imageHTML(p)}
        <h2>${esc(p.title)}</h2>
        <div class="message">${esc(p.message)}</div>
        ${attachmentHTML(p)}
        <a href="${backLink(p.type)}" class="btn">← Back</a>
      `;
    })
    .catch(e=>console.error(e));
}

function imageHTML(post){
  const img=(post.image||"").trim();
  if(!img)return "";
  return `<img class="post-image" src="${escAttr(img)}" alt="${esc(post.title||"Post image")}" loading="lazy">`;
}

function attachmentHTML(post){
  const a=(post.attachment||"").trim();
  if(!a)return "";
  return `<br><a href="${escAttr(a)}" target="_blank" class="btn">Download Attachment</a>`;
}

function backLink(t){
  if(t==="School Advisory"||t==="Reminder")return"announcements.html";
  if(t==="News")return"news.html";
  if(t==="Event")return"events.html";
  return"index.html";
}

function normalizePosts(posts){
  return posts.map((p,i)=>{
    const d=new Date(p.date);
    return {
      id:p.id||i,
      type:(p.type||"").trim(),
      title:p.title||"Untitled Post",
      message:p.message||"",
      image:p.image||"",
      attachment:p.attachment||"",
      dateObj:isNaN(d.getTime())?new Date(0):d
    };
  }).sort((a,b)=>b.dateObj-a.dateObj);
}

function fmtDate(d){
  if(!(d instanceof Date)||isNaN(d.getTime()))return "";
  return d.toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
}

function esc(v){
  return String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

function escAttr(v){
  return esc(v);
}
