import { QuoteData } from '../types';

export function buildSignatureHtml(svgRef: SVGSVGElement, data: QuoteData): Blob {
  const serializer = new XMLSerializer();
  const vb = svgRef.viewBox.baseVal;
  const pageWidth = vb.width || 794;
  const pageHeight = 1123;
  const pageCount = Math.max(1, Math.ceil((vb.height || pageHeight) / pageHeight));

  const pageSvgs = Array.from({ length: pageCount }, (_, index) => {
    const clone = svgRef.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('viewBox', `0 ${index * pageHeight} ${pageWidth} ${pageHeight}`);
    clone.setAttribute('width', String(pageWidth));
    clone.setAttribute('height', String(pageHeight));
    return serializer.serializeToString(clone);
  }).join('');

  const metaB64 = btoa(unescape(encodeURIComponent(JSON.stringify({
    clientName: data.clientName,
    docType: data.docType,
    quoteNumber: data.quoteNumber,
  }))));
  const accent = data.accentColor;
  const title = (data.docType === 'facture' ? 'Facture' : 'Devis') + ' ' + data.quoteNumber;

  const css = `
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:#F0F0F0}
body{font-family:Inter,system-ui,sans-serif;min-height:100vh;display:flex;flex-direction:column;align-items:center}
.hdr{background:#fff;border-bottom:1px solid #E0E0E0;width:100%;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10}
.logo{display:flex;align-items:center;gap:8px}.logo-b{width:36px;height:36px;border-radius:8px;background:${accent};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:14px}
.logo-t div:first-child{font-size:13px;font-weight:800;color:#111}.logo-t div:last-child{font-size:9px;color:#999;letter-spacing:3px}
.badge{padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;background:#EFF6FF;color:#3B82F6}.badge-ok{background:#ECFDF5;color:#10B981}
.prev{max-width:720px;width:100%;padding:24px}.prev svg{display:block;width:100%;height:auto;background:#fff;margin-bottom:18px}
.bar{background:#fff;border-top:1px solid #E0E0E0;width:100%;padding:20px 24px;display:flex;align-items:center;justify-content:center;gap:12px;position:sticky;bottom:0;z-index:5}
.btn{padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;border:none;cursor:pointer;transition:opacity .2s}.btn:hover{opacity:.9}.btn-a{background:${accent};color:#fff}.btn-g{background:#10B981;color:#fff}
.mbg{position:fixed;inset:0;background:rgba(0,0,0,.4);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:100}
.mdl{background:#fff;border-radius:16px;width:560px;max-width:95vw;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,.3)}
.mh{padding:16px 24px;border-bottom:1px solid #E8E8E8;display:flex;justify-content:space-between;align-items:center}.mh h3{font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase}
.mtabs{display:flex;border-bottom:1px solid #E8E8E8}
.mtab{flex:1;padding:12px 8px;font-size:11px;font-weight:700;letter-spacing:1px;text-align:center;border:none;background:#fff;cursor:pointer;color:#BBB;transition:all .2s}
.mtab.active{color:#111;box-shadow:inset 0 -2px 0 ${accent}}
.mb{padding:24px}.mb canvas{border:2px solid #E8E8E8;border-radius:12px;width:100%;cursor:crosshair;touch-action:none}
.import-area{border:2px dashed #DDD;border-radius:12px;padding:24px;text-align:center;cursor:pointer;transition:border-color .2s;background:#FAFAFA;display:block}
.import-area:hover{border-color:${accent}}
.import-preview{max-width:100%;max-height:160px;margin:12px auto 0;display:none;border-radius:8px;border:1px solid #E8E8E8}
.mf{padding:16px 24px;display:flex;justify-content:space-between;border-top:1px solid #E8E8E8}.bc{padding:8px 16px;font-size:12px;font-weight:700;color:#999;border:1px solid #E0E0E0;border-radius:8px;background:#fff;cursor:pointer}.bs{padding:10px 24px;font-size:13px;font-weight:700;color:#fff;border:none;border-radius:8px;background:${accent};cursor:pointer}.info{text-align:center;font-size:13px;color:#888}
@media print{
  @page{size:A4 portrait;margin:0}
  html,body{width:210mm;min-width:210mm;background:#fff;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .hdr,.bar,.mbg{display:none!important}
  .prev{display:block;width:210mm;max-width:none;padding:0;margin:0}
  .prev svg{display:block;width:210mm;height:297mm;margin:0;padding:0;box-shadow:none;break-after:page;page-break-after:always}
  .prev svg:last-child{break-after:auto;page-break-after:auto}
}
`;

  const js = `
var M=JSON.parse(decodeURIComponent(escape(atob("${metaB64}"))));
var cv=document.getElementById("sc"),cx=cv.getContext("2d"),dw=false,lx=0,ly=0;
var sigMode='draw',uploadedSig=null;
function setMode(m){sigMode=m;document.getElementById("tabDraw").className=m==='draw'?'mtab active':'mtab';document.getElementById("tabImport").className=m==='import'?'mtab active':'mtab';document.getElementById("drawPane").style.display=m==='draw'?'block':'none';document.getElementById("importPane").style.display=m==='import'?'block':'none';}
cv.onmousedown=function(e){dw=true;lx=e.offsetX;ly=e.offsetY};
cv.onmousemove=function(e){if(!dw)return;cx.beginPath();cx.moveTo(lx,ly);cx.lineTo(e.offsetX,e.offsetY);cx.strokeStyle="#111";cx.lineWidth=2;cx.lineCap="round";cx.stroke();lx=e.offsetX;ly=e.offsetY};
cv.onmouseup=cv.onmouseleave=function(){dw=false};
cv.addEventListener("touchstart",function(e){e.preventDefault();var r=cv.getBoundingClientRect(),t=e.touches[0];dw=true;lx=t.clientX-r.left;ly=t.clientY-r.top},{passive:false});
cv.addEventListener("touchmove",function(e){e.preventDefault();if(!dw)return;var r=cv.getBoundingClientRect(),t=e.touches[0],x=t.clientX-r.left,y=t.clientY-r.top;cx.beginPath();cx.moveTo(lx,ly);cx.lineTo(x,y);cx.strokeStyle="#111";cx.lineWidth=2;cx.lineCap="round";cx.stroke();lx=x;ly=y},{passive:false});
cv.addEventListener("touchend",function(){dw=false});
document.getElementById("sigFile").addEventListener("change",function(e){
  var f=e.target.files[0];if(!f)return;
  if(!f.type.startsWith("image/")){alert("Veuillez selectionner une image (PNG, JPG)");return}
  var r=new FileReader();
  r.onload=function(){
    uploadedSig=r.result;
    var img=document.getElementById("previewImg");
    img.src=uploadedSig;img.style.display="block";
    document.getElementById("importHint").style.display="none";
    document.getElementById("importHint2").style.display="none";
  };
  r.readAsDataURL(f);
});
function clrS(){
  if(sigMode==='draw'){cx.clearRect(0,0,cv.width,cv.height)}
  else{
    uploadedSig=null;
    var inp=document.getElementById("sigFile");
    inp.value="";
    var pv=document.getElementById("previewImg");
    pv.style.display="none";pv.src="";
    document.getElementById("importHint").style.display="block";
    document.getElementById("importHint2").style.display="block";
  }
}
function openM(){document.getElementById("mbg").style.display="flex"}
function closeM(){document.getElementById("mbg").style.display="none"}
function isCanvasBlank(){
  var blank=document.createElement("canvas");
  blank.width=cv.width;blank.height=cv.height;
  return cv.toDataURL()===blank.toDataURL();
}
function saveS(){
  var sd;
  if(sigMode==='import'){
    if(!uploadedSig){alert("Veuillez importer une photo de votre signature");return}
    sd=uploadedSig;
  } else {
    if(isCanvasBlank()){alert("Veuillez dessiner votre signature avant de valider");return}
    sd=cv.toDataURL("image/png");
  }
  var pages=document.querySelectorAll("#svgW svg");
  var placed=false;
  for(var p=0;p<pages.length&&!placed;p++){
    var sv=pages[p],ts=sv.querySelectorAll("text");
    for(var i=0;i<ts.length;i++){
      var tx=ts[i].textContent||"";
      if(tx.indexOf("Date et Signature")>-1&&!ts[i].getAttribute("data-f")){
        var bx=parseFloat(ts[i].getAttribute("x"))||0,by=parseFloat(ts[i].getAttribute("y"))||0;
        var im=document.createElementNS("http://www.w3.org/2000/svg","image");
        im.setAttribute("href",sd);im.setAttribute("x",String(bx));im.setAttribute("y",String(by-36));im.setAttribute("width","120");im.setAttribute("height","36");im.setAttribute("preserveAspectRatio","xMidYMid meet");
        sv.appendChild(im);ts[i].setAttribute("data-f","1");ts[i].textContent=M.clientName+" - "+new Date().toLocaleDateString("fr-FR");placed=true;break;
      }
    }
  }
  if(!placed){
    var lastSv=pages[pages.length-1];
    var im2=document.createElementNS("http://www.w3.org/2000/svg","image");
    im2.setAttribute("href",sd);im2.setAttribute("x","60");im2.setAttribute("y","400");
    im2.setAttribute("width","120");im2.setAttribute("height","36");im2.setAttribute("preserveAspectRatio","xMidYMid meet");
    lastSv.appendChild(im2);
  }
  closeM();
  document.getElementById("bar1").style.display="none";
  document.getElementById("bar2").style.display="flex";
  document.getElementById("hBadge").textContent="Signe";
  document.getElementById("hBadge").className="badge badge-ok";
}
function dlPdf(){window.print()}
`;

  const scriptOpen = '<scr' + 'ipt>';
  const scriptClose = '</scr' + 'ipt>';

  const html = '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">'
    + '<title>Signer - ' + title + '</title><style>' + css + '</style></head><body>'
    + '<div class="hdr"><div class="logo"><div class="logo-b">D</div><div class="logo-t"><div>DEVIS</div><div>DESIGNER</div></div></div><span class="badge" id="hBadge">En attente de signature</span></div>'
    + '<div class="prev" id="svgW">' + pageSvgs + '</div>'
    + '<div class="bar" id="bar1"><span class="info">Ce document attend votre signature</span><button class="btn btn-a" onclick="openM()">Signer ce document</button></div>'
    + '<div class="bar" id="bar2" style="display:none"><button class="btn btn-g" onclick="dlPdf()">Enregistrer en PDF</button><span class="info" style="font-size:11px;color:#bbb">A4 \u00B7 Portrait \u00B7 Marges aucune</span></div>'
    + '<div id="mbg" class="mbg" style="display:none" onclick="closeM()"><div class="mdl" onclick="event.stopPropagation()"><div class="mh"><h3>Votre signature</h3><button onclick="closeM()" style="border:none;background:#F0F0F0;border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:14px;color:#999">X</button></div>'
    + '<div class="mtabs"><button id="tabDraw" class="mtab active" onclick="setMode(\'draw\')">Dessiner</button><button id="tabImport" class="mtab" onclick="setMode(\'import\')">Importer photo</button></div>'
    + '<div class="mb"><div id="drawPane"><canvas id="sc" width="472" height="200"></canvas></div>'
    + '<div id="importPane" style="display:none"><label for="sigFile" class="import-area"><div id="importHint" style="font-size:13px;font-weight:700;color:#555">Cliquer pour choisir une photo</div><div id="importHint2" style="font-size:11px;color:#AAA;margin-top:6px">PNG, JPG, JPEG \u2014 photo de votre signature manuscrite</div><input id="sigFile" type="file" accept="image/*" style="display:none"><img id="previewImg" class="import-preview" alt="Apercu signature"></label></div></div>'
    + '<div class="mf"><button class="bc" onclick="clrS()">EFFACER</button><button class="bs" onclick="saveS()">Valider la signature</button></div></div></div>'
    + scriptOpen + js + scriptClose + '</body></html>';

  return new Blob([html], { type: 'text/html;charset=utf-8' });
}
