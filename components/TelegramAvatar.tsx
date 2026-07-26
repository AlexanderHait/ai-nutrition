export default function TelegramAvatar({
  profile,
  size="medium",
  className="",
}:{profile:any;size?:"small"|"medium"|"large"|"huge";className?:string}){
  const id=Number(profile?.telegram_id||0);
  const direct=String(profile?.avatar_url||"").trim();
  const src=direct || (id?`/api/avatar/${id}`:"");
  const initial=String(profile?.first_name||profile?.username||"К")[0]?.toUpperCase()||"К";
  if(!src)return <div className={`avatar tgAvatar ${size} ${className}`}>{initial}</div>;
  return <div className={`avatar tgAvatar ${size} ${className}`}>
    <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer"/>
    <span>{initial}</span>
  </div>;
}
