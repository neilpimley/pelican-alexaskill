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
/** 
* Called when the session starts. 
*/ 
function onSessionStarted(sessionStartedRequest, session) { 
   console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId + ", sessionId=" + session.sessionId); 
} 
/** 
* Called when the user launches the skill without specifying what they want. 
*/ 
function onLaunch(launchRequest, session, callback) { 
   console.log("onLaunch requestId=" + launchRequest.requestId + ", sessionId=" + session.sessionId); 
   // Dispatch to your skill's launch. 
   getWelcomeResponse(callback); 
} 
/** 
* Called when the user specifies an intent for this skill. 
*/ 
function onIntent(intentRequest, session, callback) { 
   console.log("onIntent requestId=" + intentRequest.requestId + ", sessionId=" + session.sessionId); 
   var intent = intentRequest.intent, 
       intentName = intentRequest.intent.name; 
       
       console.log(intentName);
       
   // Dispatch to your skill's intent handlers 
   if("WelcomeIntent" === intentName) { 
        getWelcomeResponse(callback); 
   } 
   if ("SearchForProperties" === intentName) { 
        FindHouses(intent, session, callback); 
   } else if ("AMAZON.HelpIntent" === intentName) { 
        getHelpResponse(callback); 
   } else if ("AMAZON.StopIntent" === intentName || "AMAZON.CancelIntent" === intentName) { 
        handleSessionEndRequest(callback); 
   } else { 
       throw "Invalid intent"; 
   } 
} 
/** 
* Called when the user ends the session. 
* Is not called when the skill returns shouldEndSession=true. 
*/ 
function onSessionEnded(sessionEndedRequest, session) { 
   console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId + ", sessionId=" + session.sessionId); 
   // Add cleanup logic here 
} 
// --------------- Functions that control the skill's behavior ----------------------- 
function getWelcomeResponse(callback) { 
   // If we wanted to initialize the session to have some attributes we could add those here. 
   var cardTitle = "P.J. McIlroy Estate Agent"; 
   var speechOutput = "Welcome to the Pee Jay McElroy estate agent home finder. " + 
       "Please ask me to find me a house in Ballycastle under £250,000"; 
   // If the user either does not reply to the welcome message or says something that is not 
   // understood, they will be prompted again with this text. 
   var repromptText = "Please ask me to find propertis in a town under a certain price by sayin find houses in Ballycastle under £100,000"; 
   var shouldEndSession = false; 
   callback(buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession)); 
} 
function handleSessionEndRequest(callback) { 
   var cardTitle = "Session Ended"; 
   var speechOutput = "Thank you for using the Pee Jay McElroy homefinder."; 
   // Setting this to true ends the session and exits the skill. 
   var shouldEndSession = true; 
   callback(buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession)); 
} 


function FindHouses(intent, session, callback) { 
   var cardTitle = "Property Search"; 
    var town = intent.slots.town;  
    var bedrooms = intent.slots.bedrooms;  
    var maxPrice = intent.slots.maxPrice; 
   
   var repromptText = ""; 
   var shouldEndSession = true; 
   var speechOutput = ""; 
   var noBedrooms = 0;
   var price = 1000000;
   if (town && town.value) { 
        if (maxPrice && maxPrice.value != '?') {
            price = maxPrice.value
        }

        if (bedrooms && bedrooms.value) {
            noBedrooms = bedrooms.value
        }

       sendWebRequest(town.value, noBedrooms, price, callback); 
   } else { 
       speechOutput = 'I was unable to find any proprties that met your criteria, please try again specifing a town.'; 
       repromptText = "What town do you want to find properties in?"; 
       callback(
           buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession)); 
   } 
} 

function getHelpResponse(callback) { 
   // If we wanted to initialize the session to have some attributes we could add those here. 
   var cardTitle = "home finder"; 
   var speechOutput = "You can me to find properties in a town such as Ballycastle under a certain price" + 
   "For a list of properties visit www.pjmcilroy.com"; 
   // If the user either does not reply to the welcome message or says something that is not 
   // understood, they will be prompted again with this text. 
   var repromptText = "Please ask me to find properties in a town of your choice"; 
   var shouldEndSession = false; 
   callback( 
       buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession)); 
} 

function sendWebRequest(town, bedrooms, maxPrice, callback) 
{ 
    var _this = this; 
    var cardTitle = 'Unexpected Error';
    var url = 'http://www.pjmcilroy.com/Umbraco/Api/AlexaSearch/GetProperties/?Town='+town+'&Bedrooms='+bedrooms+'&MaxPrice='+maxPrice;

    console.log("Requesting: " + url); 
    http.get(url, function(res){ 
               res.setEncoding('utf8'); 
               res.on('data', function(chunk){ 
                   var resultArray; 
                   var shouldEndSession;
                   cardTitle = 'Property Search';
                   if(chunk) 
                       resultArray = JSON.parse('' + chunk); 
                   else 
                       _this.console.log('Unable to resolve web request to pjmcilroy.com.') 
                    
                    var repromptText = 'Search again';

                    if (resultArray.length > 0) {
                        speechOutput = 'We have found ' +  resultArray.length + ' properties in ' + town + ' you might be interested in. The most expensive is a ' 
                            + resultArray[0].Bedrooms + ' bedroom, ' + resultArray[0].PropertyType + ' at ' + resultArray[0].Address 
                            + ' for sale for £' + resultArray[0].Price; 
                        shouldEndSession = true;
                    } else {
                        speechOutput = 'We do not have any properties that match your requirements. Please widen your search and try again.'; 
                        shouldEndSession = false;
                    }
                    
                    callback(buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));       
               }); 
       }).on('error', function (e) { 
           speechOutput = 'I am sorry. I was unable to understand your request.'; 
           repromptText = 'Please ask me to find houses by saying, Find houses in Ballycastle'; 
           callback( 
               buildSpeechletResponse(cardTitle, speechOutput, repromptText, false)); 
       }); 
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
           title: "P.J. McIlroy - " + title, 
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