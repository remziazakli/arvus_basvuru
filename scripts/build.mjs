import {readdir,readFile,cp,rm,stat} from 'node:fs/promises';
import {join,dirname,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
const root=resolve('public');
async function check(dir){
  for(const entry of await readdir(dir,{withFileTypes:true})){
    const path=join(dir,entry.name);
    if(entry.isDirectory()){await check(path);continue;}
    if(entry.name.endsWith('.js')){
      execFileSync(process.execPath,['--check',path],{stdio:'inherit'});
      if(!path.includes('/vendor/')){
        const source=await readFile(path,'utf8');
        for(const match of source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)){
          await stat(resolve(dirname(path),match[1].split('?')[0]));
        }
      }
    }
  }
}
await check(root);
for(const file of ['index.html','admin.html','yonetim/index.html','yonetim/app.js','yonetim/api.js','yonetim/model.js','yonetim/panel.css']) await stat(join(root,file));
const html=await readFile(join(root,'yonetim/index.html'),'utf8');
for(const match of html.matchAll(/(?:href|src)="(\.\/[^"]+)"/g))await stat(resolve(root,'yonetim',match[1]));
await rm('dist',{recursive:true,force:true});
await cp(root,'dist',{recursive:true});
console.log('Static build ready: dist/ (existing application pages + /yonetim/)');
