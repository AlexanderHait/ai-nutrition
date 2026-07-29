export default function AdminBadge({compact=true}:{compact?:boolean}){
  return <span
    title="Администратор"
    style={{
      display:"inline-flex",
      alignItems:"center",
      justifyContent:"center",
      marginLeft:compact?6:0,
      padding:compact?"2px 6px":"4px 8px",
      borderRadius:999,
      border:"1px solid rgba(232,194,91,.42)",
      background:"rgba(232,194,91,.10)",
      color:"#e8c25b",
      fontSize:compact?9:10,
      lineHeight:1.2,
      fontWeight:800,
      letterSpacing:".04em",
      verticalAlign:"middle",
      whiteSpace:"nowrap"
    }}
  >АДМИН</span>
}
