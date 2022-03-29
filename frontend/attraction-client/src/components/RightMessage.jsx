import React from "react";
import Header from "../components/header";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { Button, Card, Container, TextField, Typography, LinearProgress, Box } from "@mui/material";
import "./styles/rightmessagestyle.css"
import { useEffect } from 'react';

function RightMessage (props) {

    useEffect(async() => {
        if (props.path) {
            console.log("BLALBALBLAB");
            const result = await fetch("http://localhost:5000/file?"+new URLSearchParams({file: props.path}).toString(), {
                method: "GET",
                credentials: "include"
            });
            const blob = await result.blob();
            console.log("BLOOB");
            console.log(blob);
        }
    }, []);

    return (

        <Container  sx={{
            marginLeft: 32, 
            backgroundColor: 'primary.light',
            borderBottomRightRadius: 25,
            borderTopRightRadius: 5,
            borderBottomLeftRadius: 17,
            borderTopLeftRadius: 17,
            marginBottom: 1,
            paddingLeft: 1,
            paddingRight: 1,
            paddingBottom: 1.5,
            paddingTop: 1.5,
            
            
           }}>
        <p >{props.message}</p>
        <Card sx={{backgroundColor: "secondary.light", width: "3em"}}>{props.time}</Card>
        </Container>

    );

}

export default RightMessage;