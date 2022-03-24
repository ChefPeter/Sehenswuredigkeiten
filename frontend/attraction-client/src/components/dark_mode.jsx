import * as React from 'react';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import { useTheme, ThemeProvider, createTheme } from '@mui/material/styles';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import rootReducer from '../reducers/rootReducer';
import store from '../reducers/store';
import { Pape, Card, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { useSelector } from 'react-redux';

const ColorModeContext = React.createContext({ toggleColorMode: () => {} });

function Mode() {
  const theme = useTheme();
  const colorMode = React.useContext(ColorModeContext);
  
  return (
    <ListItem button onClick={colorMode.toggleColorMode}>
     
      
        <ListItemIcon>
        {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}

            </ListItemIcon>
            
            <ListItemText primary={"Switch Mode"} />
   
    </ListItem>
  );
}

export default function Dark_Mode() {
  const defaultTheme = useSelector(state => {
    try{
      return state.theme;
    }catch(e){
      return "dark";
    }
  });
  const [mode, setMode] = React.useState(defaultTheme);
  const colorMode = React.useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
        const changeTheme = { type: 'CHANGE_THEME', theme: "unknown"};
        store.dispatch(changeTheme)  
      },
    }),
    [],
  );

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode,
        },
      }),
    [mode],
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <Mode />
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}