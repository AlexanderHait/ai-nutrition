import {NextRequest,NextResponse} from "next/server";
import {session} from "@/lib/auth";
import {getSupabaseAdmin} from "@/lib/supabase-admin";

export const runtime="nodejs";

const MAX_BYTES=10*1024*1024;
const ALLOWED=new Set(["image/jpeg","image/png","image/webp","image/heic","image/heif","application/pdf"]);

function safeExt(file:File){
  const map:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/heic":"heic","image/heif":"heif","application/pdf":"pdf"};
  return map[file.type]||"bin";
}

export async function POST(req:NextRequest){
  let uploadedPath:string|null=null;
  try{
    const auth=await session();
    if(auth?.role!=="client"||!auth.chatId)return NextResponse.json({error:"Unauthorized"},{status:401});

    const form=await req.formData();
    const content=String(form.get("content")||"").trim().slice(0,3000);
    const value=form.get("file");
    const file=value instanceof File&&value.size>0?value:null;

    if(!content&&!file)return NextResponse.json({error:"Добавьте текст, фото или PDF"},{status:400});
    if(file){
      if(file.size>MAX_BYTES)return NextResponse.json({error:"Файл должен быть не больше 10 МБ"},{status:413});
      if(!ALLOWED.has(file.type))return NextResponse.json({error:"Можно прикрепить фото или PDF"},{status:415});
    }

    const supabase=getSupabaseAdmin();
    let attachmentMime:string|null=null;
    let attachmentName:string|null=null;
    let attachmentSize:number|null=null;
    if(file){
      const ext=safeExt(file);
      uploadedPath=`${auth.chatId}/client-web-${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const bytes=Buffer.from(await file.arrayBuffer());
      const {data:stored,error:uploadError}=await supabase.storage.from("support-media").upload(uploadedPath,bytes,{contentType:file.type,upsert:false,cacheControl:"3600"});
      if(uploadError||!stored?.path)throw new Error(`Storage upload failed: ${uploadError?.message||"no storage path returned"}`);
      attachmentMime=file.type;
      attachmentName=file.name||`support.${ext}`;
      attachmentSize=file.size;
    }

    const {data,error}=await supabase.from("support_messages").insert({
      chat_id:auth.chatId,
      sender:"client",
      content:content||(file?.type==="application/pdf"?"PDF":"Фото"),
      attachment_path:uploadedPath,
      attachment_mime:attachmentMime,
      attachment_name:attachmentName,
      attachment_size:attachmentSize,
    }).select("*").single();

    if(error||!data){
      if(uploadedPath)await supabase.storage.from("support-media").remove([uploadedPath]);
      throw new Error(`support_messages insert failed: ${error?.message||"no row returned"}`);
    }
    return NextResponse.json({ok:true,message:data});
  }catch(error){
    console.error("client support media error",error);
    return NextResponse.json({error:error instanceof Error?error.message:"Не удалось отправить сообщение"},{status:500});
  }
}
