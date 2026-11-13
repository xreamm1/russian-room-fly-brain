import { defineConfig } from 'vite';
export default defineConfig({base:'/russian-room-fly-brain/',server:{host:'127.0.0.1',port:5173,strictPort:true,proxy:{'/russian-room-fly-brain/api':{target:'http://127.0.0.1:8765',ws:true,rewrite:path=>path.replace('/russian-room-fly-brain/api','')}}},build:{target:'es2022'}});
