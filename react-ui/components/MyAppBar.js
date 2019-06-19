const { withStyles } = MaterialUI
const { AppBar } = MaterialUI
const { Toolbar } = MaterialUI
const { Typography } = MaterialUI

const styles = theme => ({
  root: {
    //marginTop: theme.spacing.unit * 3,
    width: '100%',
  },
});

function MyAppBar(props) {
  const { classes } = props;
  return (
    <div className={classes.root}>
      <AppBar position="static" color="default">
        <Toolbar>
          <img src="/icons/icon-64.png" className="appicon" />
          <Typography type="title" color="inherit">
            Connection Forwarder
          </Typography>
        </Toolbar>
      </AppBar>
    </div>
  );
}

MyAppBar.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(MyAppBar);
