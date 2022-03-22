import './App.css';
import "./register.css";
import { Link } from "react-router-dom";
import { Button, TextField, Alert, AlertTitle} from '@mui/material';
import Header from '../components/header';
import DeleteIcon from '@mui/icons-material/Delete';

function Login() {
  return (
    <div id='hintergrund'>
        <div id='eingaben'>

            <TextField id="filled-basic" label="Benutzername" variant="filled" />
            <br></br>
            <TextField id="filled-basic" label="Email" variant="filled" />
            <br></br>
            <TextField id="filled-basic" label="Passwort" variant="filled" />
            <br></br>
            <TextField id="filled-basic" label="Passwort Wiederholen" variant="filled" />
            <br></br>
            <Button variant="text">Registrieren</Button>
           
            <div>
                <Alert severity="info">
                <AlertTitle>Info</AlertTitle>
                Eine Bestätigungsemail wurde versandt — <strong>Checke dein Postfach</strong>
                </Alert>
            </div>

            <Button variant="text"><Link to="/" style={{ textDecoration: 'none' }}>Schon angemeldet?</Link></Button>

        </div>    
    </div>
  );
}

export default Login;