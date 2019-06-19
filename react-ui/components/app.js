import MyApp from './MyApp.js'

const { MuiThemeProvider, CssBaseline, createMuiTheme, colors } = MaterialUI

const theme = createMuiTheme({
  palette: {
    primary: {
      main: '#ff4400',
    },
    secondary: {
      main: '#3f51b5',
    },
  },
});


function ThemedApp() {
  return (
    <React.Fragment>
      <MuiThemeProvider theme={theme}>
        <MyApp />
      </MuiThemeProvider>
    </React.Fragment>
  );
}

ReactDOM.render(<ThemedApp />, document.getElementById('myapp'))
