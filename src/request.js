function sendWebRequest() 
{ 
    var _this = this; 
    const TOKEN  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyIiOiIifQ.G5ed2SpILJdLUmjoXVGYWTMSQlJ8boLptydemtOM52Q";
    const url = 'https://santander.openbankproject.com/obp/v3.0.0/banks/santander.01.uk.sanuk/accounts/Funds/owner/account';

    console.log("Requesting: " + url); 
    http.get(url, {} , function(res){ 
               res.setEncoding('utf8'); 
               res.setHeader('Content-Type', 'application/json');
               res.setHeader('Authorization',  `DirectLogin token="${TOKEN}"`  );
               res.on('data', function(data){ 
                   var result; 
                   if(data) 
                       result = JSON.parse('' + data); 
                   else 
                       _this.console.log('Unable to resolve web request to santander.openbankproject..') 
                    return data.balance.amount;
               }); 
       }).on('error', function (e) { 
           return -1;
       }); 
} 