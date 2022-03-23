import './App.css';
import "./register.css";
import { Link } from "react-router-dom";
import { Button, TextField, Alert, AlertTitle} from '@mui/material';
import Header from '../components/header';
import DeleteIcon from '@mui/icons-material/Delete';
import {useState , setState} from "react";

let usernameInput = "";
let emailInput = "";
let passwordInput = "";
let retypePasswordInput = "";

function Login() {

    const getUsernameValue = (event)=>{
        usernameInput = event.target.value;
    };
    const getEmailValue = (event) => {
        emailInput = event.target.value;
    }
    const getPasswordValue = (event) => {
        passwordInput = event.target.value;
    };
    const getRetypePasswordValue = (event) => {
        retypePasswordInput = event.target.value;
    };

    const [errorText, setErrorText] = useState("Error");
    const [showInfoAlert, setShowInfoAlert] = useState(false);
    const [showErrorAlert, setShowErrorAlert] = useState(false);

  return (
      <div id='hintergrund'>
          <div id='eingaben'>

              <TextField id="filled-basic" label="Benutzername" variant="filled" onChange={getUsernameValue} />
              <br></br>
              <TextField id="filled-basic" label="Email" variant="filled" onChange={getEmailValue} />
              <br></br>
              <TextField id="filled-password-input" label="Passwort" type="password" autoComplete="current-password" variant="filled" onChange={getPasswordValue} />
              <br></br>
              <TextField id="filled-password-input" label="Passwort wiederholen" type="password" autoComplete="current-password" variant="filled" onChange={getRetypePasswordValue} />
              <br></br>
              <Button id="knopf" variant="text" onClick={() => post(setErrorText, setShowErrorAlert, setShowInfoAlert)}>Registrieren</Button>
              <br></br>
              <Button id='knopf' variant="text"><Link to="/" style={{ textDecoration: 'none' }}>Schon angemeldet?</Link></Button>
              <br></br>
              <div>

                  {showErrorAlert ?
                      <Alert severity="error">
                          <AlertTitle>Error</AlertTitle>
                          {errorText}
                      </Alert>
                      : null}


                  {showInfoAlert ? <Alert false severity="info">
                      <AlertTitle>Info</AlertTitle>
                      Eine Bestätigungsemail wurde versandt — <strong>Checke dein Postfach</strong>
                  </Alert> : null}

              </div>
          </div>

      </div>
  );
}

function post (setErrorText, setShowErrorAlert, setShowInfoAlert){

    
    let formData = new FormData();
    formData.append('username', usernameInput);
    formData.append('email', emailInput);
    formData.append('password', passwordInput);
    formData.append('repeat-password', retypePasswordInput);

    fetch("http://10.171.155.127:5000/register", {
        method: "post",
        body: formData
    }).then(res => {
        if (res.status == 400) {
            setShowInfoAlert(false);
            res.text().then(e => setErrorText(e));
            setShowErrorAlert(true);
        } else {
            // Infofeld sichtbar machen
            setShowErrorAlert(false);
            setShowInfoAlert(true);
        }
    });


}

export default Login;