BE="https://fahem-agent-1061555578804.us-east4.run.app"
IDT="$(gcloud auth print-identity-token 2>/dev/null)"
EM="hesham1988@gmail.com"
for i in $(seq 1 25); do
  RES=$(python -c "
import urllib.request,json,socket
_o=socket.getaddrinfo
socket.getaddrinfo=lambda h,p,*a,**k:_o('34.143.79.2',p,*a,**k) if 'run.app' in h else (_o('35.219.200.193',p,*a,**k) if h=='fahem.pro' else _o(h,p,*a,**k))
BE='$BE'; IDT='''$IDT'''; EM='$EM'
def g(u,tok=None):
    h={'User-Agent':'Fahem-ReExec'}
    if tok: h['Authorization']='Bearer '+tok
    try: return json.loads(urllib.request.urlopen(urllib.request.Request(u,headers=h),timeout=30).read().decode('utf-8','ignore'))
    except Exception as e: return {'err':str(e)[:80]}
ph=len(g(BE+'/user/practice-history?userEmail='+EM,IDT).get('records',[]))
zh=len(g(BE+'/user/zatona-history?userEmail='+EM,IDT).get('records',[]))
st=g(BE+'/user/stats?userEmail='+EM,IDT).get('stats',{})
fe=g('https://fahem.pro/api/version').get('sha','?')[:7]
print(f'practice={ph} zatona={zh} xp={st.get(\"totalXp\")} streak={st.get(\"currentStreak\")} FEsha={fe}')
" 2>&1)
  echo "[tick $i] $RES"
  if echo "$RES" | grep -qE 'practice=[1-9]|zatona=[1-9]'; then echo "RECORDS_APPEARED"; exit 0; fi
  sleep 60
done
echo "POLL_TIMEOUT_NO_RECORDS"
