var http = require('http'); 

exports.handler = function (event, context) { 
   try { 
       if (event.session.new) { 
           onSessionStarted({ requestId: event.request.requestId }, event.session); 
       } 
       if (event.request.type === "LaunchRequest") { 
           onLaunch(event.request, 
               event.session, 
               function callback(speechletResponse) { 
                   context.succeed(buildResponse(speechletResponse)); 
               }); 
       } else if (event.request.type === "IntentRequest") { 
           onIntent(event.request, 
               event.session, 
               function callback( speechletResponse) { 
                   context.succeed(buildResponse(speechletResponse)); 
               }); 
       } else if (event.request.type === "SessionEndedRequest") { 
           onSessionEnded(event.request, event.session); 
           context.succeed(); 
       } 
   } catch (e) { 
       context.fail("Exception: " + e); 
   } 
}; 

function onSessionStarted(sessionStartedRequest, session) { 
   console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId + ", sessionId=" + session.sessionId); 
} 

function onLaunch(launchRequest, session, callback) { 
   console.log("onLaunch requestId=" + launchRequest.requestId + ", sessionId=" + session.sessionId); 
   // Dispatch to your skill's launch. 
   getWelcomeResponse(callback); 
} 

function onIntent(intentRequest, session, callback) { 
   console.log("onIntent requestId=" + intentRequest.requestId + ", sessionId=" + session.sessionId); 
   var intent = intentRequest.intent, 
       intentName = intentRequest.intent.name; 
       
   // Dispatch to your skill's intent handlers 
   if("WelcomeIntent" === intentName) { 
        getWelcomeResponse(callback); 
   } 
   if ("BalanceStatusCheck" === intentName || "BalanceActual" === intentName) { 
        getBalanceAndSendResponse(intentName, callback); 
   } else if ("AMAZON.HelpIntent" === intentName) { 
        getHelpResponse(callback); 
   } else if ("AMAZON.StopIntent" === intentName || "AMAZON.CancelIntent" === intentName) { 
        handleSessionEndRequest(callback); 
   } else { 
       handleNoIntent(callback); 
   } 
} 

function onSessionEnded(sessionEndedRequest, session) { 
   console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId + ", sessionId=" + session.sessionId); 
} 


// --------------- Functions that control the skill's behavior ----------------------- 
function getWelcomeResponse(callback) { 
   var cardTitle = "Pelican"; 
   var speechOutput = "Welcome to Pelican. We take the anxiety out of checking your bank account balance"; 
   var repromptText = "Please ask me how your bank account is"; 
   var shouldEndSession = false; 
   callback(buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession)); 
} 
function handleSessionEndRequest(callback) { 
   var cardTitle = "Session Ended"; 
   var speechOutput = "Thank you for using the Pelican balance health checker."; 
   // Setting this to true ends the session and exits the skill. 
   callback(buildSpeechletResponse(cardTitle, speechOutput, null, true)); 
} 
function handleNoIntent(callback) { 
   var cardTitle = "Pelican"; 
   var speechOutput = "Sorry we don't understand that command"; 
   callback(buildSpeechletResponse(cardTitle, speechOutput, null, true)); 
} 

function getBalanceAndSendResponse(intentName, callback) 
{ 
  var speechOutput;
  var cardTitle;
    http.get('http://167.99.82.88:3000/account', (res) => {
        const { statusCode } = res;
        const contentType = res.headers['content-type'];
  
        let error;
        if (statusCode !== 200) {
        error = new Error('Request Failed.\n' +
                            `Status Code: ${statusCode}`);
        } else if (!/^application\/json/.test(contentType)) {
        error = new Error('Invalid content-type.\n' +
                            `Expected application/json but received ${contentType}`);
        }
        if (error) {
            speechOutput = 'I am sorry. I was unable to understand your request.'; 
            callback( 
               buildSpeechletResponse(cardTitle, speechOutput, null, true)); 
            res.resume();
            return;
        }
    
        res.setEncoding('utf8');
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
        try {
            const parsedData = JSON.parse(rawData);
            
            if ("BalanceStatusCheck" === intentName) {
                speechOutput = getBalanceStatusSpeech(parsedData.balance.amount);
            } else if ("BalanceActual" === intentName) {
                speechOutput = 'Your balance is £' + parsedData.balance.amount; 
            }

           callback( 
               buildSpeechletResponse(cardTitle, speechOutput, null, true)); 
        } catch (e) {
            speechOutput = 'I am sorry. I was unable to understand your request.'; 
            callback( 
               buildSpeechletResponse(cardTitle, speechOutput, null, true)); 
        }
        });
    }).on('error', (e) => {
            speechOutput = 'I am sorry. I was unable to understand your request.'; 
            callback( 
               buildSpeechletResponse(cardTitle, speechOutput, null, true)); 
    });
   
} 

function getHelpResponse(callback) { 
   var cardTitle = "Pelican Balance Health Check"; 
   var speechOutput = "You can find out the health of you bank balance by asking me"; 
   var repromptText = "Please ask me the health of your bank balance"; 
   var shouldEndSession = false; 
   callback( 
       buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession)); 
} 

function getBalanceStatusSpeech(balance) {
    // RED
    if (balance < 10) return "Your balance is not in a good place. Might be time to stop spending.";
    if (balance < 100) return "If I was you I'd stick to beans and toast until you get paid";
    // AMBER
    if (balance < 500 ) return "Don't be going mad on the plastic if you haven't paid your rent yet";
    if (balance < 1000 ) return "You are in the comfort zone";
    // GREEN
    if (balance < 5000 ) return "You could afford a foreign holidday if you fancied it";
    if (balance < 10000 ) return "Unless you want to buy a mercedes cash this month you've nothing to worry about";
    if (balance >= 10000 ) return "You're in the money my friend";
    return "I've no idea";
}



// --------------- Helpers that build all of the responses ----------------------- 
function buildSpeechletResponse(title, output, repromptText, shouldEndSession) { 
   return { 
       outputSpeech: { 
           type: "PlainText", 
           text: output 
       }, 
       card: { 
           type: "Simple", 
           title: "Pelican - " + title, 
           content: "" + output 
       }, 
       reprompt: { 
           outputSpeech: { 
               type: "PlainText", 
               text: repromptText 
           } 
       }, 
       shouldEndSession: shouldEndSession 
   }; 
} 
function buildResponse(speechletResponse) { 
   return { 
       version: "1.0", 
       response: speechletResponse
   }; 
} 

