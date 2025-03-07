import { Card } from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ChatSendbar from "../components/ChatSendbar";
import LeftMessage from "../components/LeftMessage";
import RightMessage from "../components/RightMessage";
import Sidebar from "../components/Sidebar";
import { checkCurrentlyLoggedIn } from "../functions/checkLoggedIn";
import "./styles/chat.css";

let searchFriendInput = "";
// Define theme settings
const light = {
  palette: {
    mode: "light",
  },
};

const dark = {
  palette: {
    mode : "dark",

    // Add your custom colors if any
  },
};

/*class Chat extends React.Component {
  
  constructor(props) {
    super(props);
    this.state = { friend: "loberhauser3", messages: [] };
    //this.updateChat = this.updateChat.bind(this);
    this.updateChat();
    //const [searchParams, setSearchParams] = useSearchParams();
    //const name = searchParams.get("name");
    //console.log(new URLSearchParams(this.props.location.search).get("name"));
    
    const [messages, setMessages] = useState([]);

    this.friend = "loberhauser3";
    this.messages = [];
    fetch("https://10.10.30.18:8444/conversation?"+new URLSearchParams({friend: friend}).toString(), {
      method: "GET",
      credentials: "include"
    })
    .then(res => res.json())
    .then(res => {
      console.log("ANFRAGE WIRD GESCHICKT!");
      setMessages(res)
      //setTimeout(() => setMessages(res), 3000);
    });


  }

  updateChat() {
    this.setState({friend: "Peter"}, () => console.log(this.state));
  }

  render() {
    return (
      <ThemeProvider theme={createTheme(light)}>
            <Header />
            <Card elevation={4} sx={{
                    marginTop: 1.5, 
                    marginLeft: 1, 
                    marginRight: 1, 
                    paddingTop: 1,
                    paddingBottom: 1,
                    paddingRight: 1,
                    paddingLeft: 1}}> You are writing with: <strong>{this.state.friend}</strong></Card>
          
                <Card elevation={4} sx={{
                    marginTop: 1.5, 
                    marginLeft: 1, 
                    marginRight: 1, 
                    paddingTop: 1,
                    paddingBottom: 1,
                    paddingRight: 1,
                    paddingLeft: 1}}>
 
                    <LeftMessage message ="Hallo" time="13:00"></LeftMessage>
                    <RightMessage message ="Tschüss" time="13:01"></RightMessage>
                    
                    {this.state.messages.map(message => {
                      if (message.sender === this.friend) {
                        <LeftMessage message={message.content} time={message["message_timestamp"]}></LeftMessage>
                      } else {
                        <RightMessage message={message.content} time={message["message_timestamp"]}></RightMessage>
                      }
                    })}

                    
                </Card>

                  <Card elevation={4} sx={{
                    marginBottom: 2,
                    marginTop: 1, 
                    marginLeft: 1, 
                    marginRight: 1, 
                    paddingTop: 2,
                    paddingBottom: 2,
                    paddingRight: 1,
                    paddingLeft: 1}}>
                <ChatSendbar></ChatSendbar>
                </Card>
        </ThemeProvider>
    );
  }


}*/
let counter = 0;

const Chat = (props) => {
  
    const [searchParams, setSearchParams] = useSearchParams();
    const name = searchParams.get("name");
    const groupID = searchParams.get("group_id");

    const [messages, setMessages] = useState([]);
    const friend = name;

    const [username, setUsername] = useState("");

    const[loggedIn, setLoggedIn] = useState(false);
  
    useEffect(() => {
      setLoggedIn(checkCurrentlyLoggedIn());
    }, []);

    function func () {

      fetch("https://10.10.30.18:8444/username", {
        method: "GET",
        credentials: "include"
      }).then(res => res.text())
      .then(res => {
        setUsername(res);
      });

      let intervalID;
      if (groupID) {
        intervalID = setInterval( () => fetch("https://10.10.30.18:8444/group-conversation?"+new URLSearchParams({group_id: groupID}).toString(), {
          method: "GET",
          credentials: "include"
        })
        .then(res => res.json())
        .then(res => {
          setMessages(oldRes => {
            if (oldRes.length !== res.length) {
              setTimeout(() => scroll(), 50);
            }
            return res;
          });
        }), 250);
      }
      else {
        intervalID = setInterval( () => fetch("https://10.10.30.18:8444/conversation?"+new URLSearchParams({friend: friend}).toString(), {
          method: "GET",
          credentials: "include"
        })
        .then(res => res.json())
        .then(res => {
          setMessages(oldRes => {
            if (oldRes.length !== res.length) {
              setTimeout(() => scroll(), 50);
            }
            return res;
          });
        }), 250);
      }
      return (() => clearInterval(intervalID));
    }
  
    useEffect(func, []);

  
    const[writingTag, setWritingTag] = useState(" You are writing with: ");
    const[textfieldTag, setTextfieldTag] = useState("Type a message");
    useEffect(() => {
      if(props.l1 === "de"){
        setWritingTag(" Du schreibst mit: ");
        setTextfieldTag("Schreibe eine Nachricht");
      } else if (props.l1 === "it"){
        setWritingTag(" Stai scrivendo con: ");
        setTextfieldTag("Scrivi un messaggio");
      } else {
        setWritingTag(" You are writing with: ");
        setTextfieldTag("Type a message");
      }
    }, [props.l1])

    function scroll () {
      window.scrollTo(0, document.body.scrollHeight);
    }

    return (
        <ThemeProvider theme={createTheme(props.t1 === "dark" ? dark : light)}>
          {loggedIn ? 
            <div>
              <Card  style={{position: "fixed", minHeight:"120px", minWidth:"100%", marginTop:"0px"}}>
                <Sidebar t1={props.t1} t2={props.t2} l1={props.l1} l2={props.l2}/>
                <Card  style={{width:"100%"}}
                    elevation={4} sx={{
                      maxWidth: "98%",
                      marginTop: 8.5, 
                      paddingTop: 1,
                      marginLeft: 1, 
                      paddingBottom: 1,
                      paddingRight: 1,
                      paddingLeft: 1}}>
                    {writingTag}<strong>{name}</strong></Card>
                </Card>
            <Card style={{width:"100%", borderRadius:"0px", minHeight:"60vh", marginLeft:"0px", marginRight:"0px"}}>
             
            
                  <Card id="cardOfMessages" elevation={4} 
                    style={{marginBottom: "160px", marginTop:"125px"}}
                    sx={{
                      maxWidth: "100%",
                      marginTop: 1.5, 
                      marginLeft: 1, 
                      marginRight: 1, 
                      paddingTop: 1,
                      paddingBottom: 1,
                      paddingRight: 1,
                      paddingLeft: 1}}>
                      
                      {messages.map((message, i) => {
                        if (message.is_file) {
                          if (message.sender !== username) {
                            return <LeftMessage key={"message_"+i} path={message.content} time={message["message_timestamp"]}></LeftMessage>
                          } else {
                            return <RightMessage key={"message_"+i} path={message.content} time={message["message_timestamp"]}></RightMessage>
                          }
                        } else {
                          if (message.sender !== username) {
                            return <LeftMessage key={"message_"+i} message={message.content} time={message["message_timestamp"]}></LeftMessage>
                          } else if (!message.sender) {
                            return <LeftMessage key={"message_"+i} message={message.content} time={message["message_timestamp"]}></LeftMessage>
                          } else {
                            return <RightMessage key={"message_"+i} message={message.content} time={message["message_timestamp"]}></RightMessage>
                          }
                        }
                      })}

                      
                  </Card>
                    <Card elevation={4}  style={{position: "fixed", bottom:"0", width:"calc(100% - 16px)", height:"125px"}} sx={{
                      marginBottom: 0,
                      marginTop: 1, 
                      marginRight:3,
                      marginLeft:1,
                      paddingTop: 2,
                      paddingBottom: 1,
                      paddingRight: 1,
                      paddingLeft: 1}}>
                       
                  <ChatSendbar  name={friend} labelField={textfieldTag} isGroup={groupID} groupID={groupID}></ChatSendbar>
                  </Card>
                </Card>
              </div>
          : null}
        </ThemeProvider>
    );

}

export default Chat;