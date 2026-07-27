import {NextRequest,NextResponse} from "next/server";
import {session} from "@/lib/auth";
import {getSupabaseAdmin} from "@/lib/supabase-admin";

export const runtime="nodejs";

export async function POST(req:NextRequest){
  try{
    const auth=await session();
    if(!auth){
      return NextResponse.json({error:"Unauthorized"},{status:401});
    }

    const body=await req.json();
    const path=String(body?.path||"").trim();

    if(!path||path.includes("..")||path.startsWith("/")){
      return NextResponse.json({error:"Invalid path"},{status:400});
    }

    // Clients may only request their own support attachments.
    if(auth.role==="client"){
      if(!auth.chatId||!path.startsWith(`${auth.chatId}/`)){
        return NextResponse.json({error:"Forbidden"},{status:403});
      }
    }

    const supabase=getSupabaseAdmin();
    const {data,error}=await supabase.storage
      .from("support-media")
      .createSignedUrl(path,60*10);

    if(error||!data?.signedUrl){
      console.error("support signed-url storage error",error);
      return NextResponse.json(
        {error:"Не удалось открыть изображение"},
        {status:500},
      );
    }

    return NextResponse.json({url:data.signedUrl});
  }catch(error){
    console.error("support signed-url error",error);
    return NextResponse.json({error:"Не удалось открыть изображение"},{status:500});
  }
}
