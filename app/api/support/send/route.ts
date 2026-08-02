import {NextRequest,NextResponse} from "next/server";
import {session} from "@/lib/auth";
import {getSupabaseAdmin} from "@/lib/supabase-admin";

export const runtime="nodejs";

const MAX_BYTES=10*1024*1024;
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED=new Set(["image/jpeg","image/png","image/webp","image/heic","image/heif","application/pdf"]);

function safeExt(file:File){
  const byType:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/heic":"heic","image/heif":"heif","application/pdf":"pdf"};
  return byType[file.type]||"bin";
}

export async function POST(req:NextRequest){
  let uploadedPath:string|null=null;
  try{
    const auth=await session();
    if(auth?.role!=="admin")return NextResponse.json({error:"Unauthorized"},{status:401});

    const form=await req.formData();
    const chatId=Number(form.get("chat_id"));
    const content=String(form.get("content")||"").trim().slice(0,3000);
    const requestId=String(form.get("request_id")||"").trim();
    const value=form.get("file");
    const file=value instanceof File&&value.size>0?value:null;

    if(!Number.isSafeInteger(chatId)||chatId<=0)return NextResponse.json({error:"Некорректный chat_id"},{status:400});
    if(!UUID_RE.test(requestId))return NextResponse.json({error:"Некорректный идентификатор отправки"},{status:400});
    if(!content&&!file)return NextResponse.json({error:"Добавьте текст, фото или PDF"},{status:400});
    if(file){
      if(file.size>MAX_BYTES)return NextResponse.json({error:"Файл должен быть не больше 10 МБ"},{status:413});
      if(!ALLOWED.has(file.type))return NextResponse.json({error:"Можно прикрепить фото или PDF"},{status:415});
    }

    const supabase=getSupabaseAdmin();
    const {data:existing}=await supabase.from("support_messages").select("*").eq("chat_id",chatId).eq("sender","admin").eq("request_id",requestId).maybeSingle();
    if(existing)return NextResponse.json({ok:true,duplicate:true,message:existing});

    let attachmentMime:string|null=null;
    let attachmentName:string|null=null;
    let attachmentSize:number|null=null;
    if(file){
      const ext=safeExt(file);
      uploadedPath=`${chatId}/admin-${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const bytes=Buffer.from(await file.arrayBuffer());
      const {data:stored,error:uploadError}=await supabase.storage.from("support-media").upload(uploadedPath,bytes,{contentType:file.type,upsert:false,cacheControl:"3600"});
      if(uploadError||!stored?.path)throw new Error(`Storage upload failed: ${uploadError?.message||"no storage path returned"}`);
      attachmentMime=file.type;
      attachmentName=file.name||`support.${ext}`;
      attachmentSize=file.size;
    }

    const {data,error}=await (supabase as any).rpc("create_admin_support_message_v1",{
      _chat_id:chatId,
      _content:content,
      _request_id:requestId,
      _attachment_path:uploadedPath,
      _attachment_mime:attachmentMime,
      _attachment_name:attachmentName,
      _attachment_size:attachmentSize,
    });
    const result=Array.isArray(data)?data[0]:data;
    if(error||!result?.message_id){
      if(uploadedPath)await supabase.storage.from("support-media").remove([uploadedPath]);
      throw new Error(`support message RPC failed: ${error?.message||"no row returned"}`);
    }
    if(result.duplicate&&uploadedPath&&result.attachment_path!==uploadedPath){
      await supabase.storage.from("support-media").remove([uploadedPath]);
    }

    const message={
      id:Number(result.message_id),chat_id:Number(result.chat_id),sender:"admin",content:String(result.content||""),created_at:result.created_at,
      attachment_path:result.attachment_path||null,attachment_mime:result.attachment_mime||null,attachment_name:result.attachment_name||null,attachment_size:result.attachment_size||null,
      delivered_to_client_at:null,delivery_error:null,
    };
    return NextResponse.json({ok:true,duplicate:Boolean(result.duplicate),message});
  }catch(error){
    console.error("support send error",error);
    return NextResponse.json({error:error instanceof Error?error.message:"Не удалось отправить сообщение"},{status:500});
  }
}
