export function evalExpression(expr: string, ctx: Record<string, number> = {}): number {
  if (typeof expr !== "string") throw new Error("Expression must be string");
  const tokens:string[]=[]; const re=/\s*([A-Za-z_][A-Za-z0-9_]*|\d+(?:\.\d+)?|\^|[%*/()+\-]|,)\s*/y;
  let m:RegExpExecArray|null; re.lastIndex=0;
  while(re.lastIndex<expr.length){ m=re.exec(expr); if(!m) throw new Error("Bad token near: "+expr.slice(re.lastIndex,re.lastIndex+16)); tokens.push(m[1]); }
  const prec:Record<string,number>={"^":4,"*":3,"/":3,"%":3,"+":2,"-":2}; const right=(op:string)=>op==="^";
  const out:string[] = [], ops:string[] = []; const isFunc=(id:string)=>["min","max","round","ceil","floor"].includes(id);
  for (const t of tokens){
    if(/^\d/.test(t)) out.push(t);
    else if(/^[A-Za-z_]/.test(t)){ if(isFunc(t)) ops.push(t); else { if(!(t in ctx)) throw new Error("Unknown variable: "+t); out.push(String(ctx[t])); } }
    else if(t===","){ while(ops.length && ops[ops.length-1]!=="(") out.push(ops.pop()!); if(!ops.length) throw new Error("Misplaced comma"); }
    else if(t in prec){ while(ops.length){ const top=ops[ops.length-1]; if(!(top in prec)) break;
      if((right(t)&&prec[t]<prec[top])||(!right(t)&&prec[t]<=prec[top])) out.push(ops.pop()!); else break; } ops.push(t); }
    else if(t==="(") ops.push(t);
    else if(t===")"){ while(ops.length && ops[ops.length-1]!=="(") out.push(ops.pop()!); if(!ops.length) throw new Error("Mismatched parens"); ops.pop();
      if(ops.length && isFunc(ops[ops.length-1])) out.push(ops.pop()!); }
    else throw new Error("Unexpected token: "+t);
  }
  while(ops.length){ const op=ops.pop()!; if(op==="("||op===")") throw new Error("Mismatched parens"); out.push(op); }
  const st:number[]=[]; const bin=(f:(a:number,b:number)=>number)=>{const b=st.pop()!,a=st.pop()!; st.push(f(a,b));};
  for (const t of out){
    if(/^\d/.test(t)) st.push(parseFloat(t));
    else if(t==="+") bin((a,b)=>a+b);
    else if(t==="-") bin((a,b)=>a-b);
    else if(t==="*") bin((a,b)=>a*b);
    else if(t==="/") bin((a,b)=>{ if(b===0) throw new Error("Division by zero"); return a/b; });
    else if(t==="%") bin((a,b)=>a%b);
    else if(t==="^") bin((a,b)=>Math.pow(a,b));
    else if(t==="min"){const b=st.pop()!,a=st.pop()!; st.push(Math.min(a,b));}
    else if(t==="max"){const b=st.pop()!,a=st.pop()!; st.push(Math.max(a,b));}
    else if(t==="round"){const a=st.pop()!; st.push(Math.round(a));}
    else if(t==="ceil"){const a=st.pop()!; st.push(Math.ceil(a));}
    else if(t==="floor"){const a=st.pop()!; st.push(Math.floor(a));}
    else throw new Error("Unknown op: "+t);
  }
  if(st.length!==1) throw new Error("Invalid expression");
  return st[0];
}
