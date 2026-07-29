create or replace function public.start_client_onboarding_v2(_chat_id bigint)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
 insert into public.client_onboarding_sessions(chat_id,status,started_at,completed_at,updated_at) values(_chat_id,'pending',now(),null,now()) on conflict(chat_id) do update set status='pending',started_at=now(),completed_at=null,updated_at=now();
 return jsonb_build_object('ok',true,'chat_id',_chat_id);
end $$;
grant execute on function public.start_client_onboarding_v2(bigint) to service_role;
