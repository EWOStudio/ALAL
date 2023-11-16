import { Container, Divider, Grid, Typography } from "@mui/material";
import React from "react";
import pkg from "../../package.json";
import { randsl } from "./Translator";

const LAST_VERSION_KEY = "LastVersion";

const gridSX = {
    verticalAlign: "middle",
    alignItems: "center",
    justifyContent: "center"
};

export function UpdateHint(): React.ReactElement {
    return (
        <Container sx={{marginTop: "8rem"}}>
            <Grid container direction={"row"} sx={gridSX}>
                <Grid item sx={{marginRight: "5rem"}}>
                    <Grid container direction={"column"} sx={gridSX}>
                        <Grid container direction={"row"} sx={gridSX}>
                            <Grid item>
                                <Typography sx={{fontSize: "6rem", color: "gray"}}>
                                    {localStorage.getItem(LAST_VERSION_KEY)}
                                </Typography>
                            </Grid>
                            <Grid item>
                                <Typography
                                    sx={{
                                        fontSize: "5rem",
                                        color: "secondary.main",
                                        margin: "3rem"
                                    }}
                                >
                                    {">>"}
                                </Typography>
                            </Grid>
                            <Grid item>
                                <Typography sx={{fontSize: "6rem", color: "primary.main"}}>
                                    {pkg.updatorVersion}
                                </Typography>
                            </Grid>
                        </Grid>
                        <Typography sx={{fontSize: "3rem", color: "primary.main", marginTop: "-3rem"}}>
                            {pkg.appVersion}
                        </Typography>
                    </Grid>
                </Grid>
                <Divider
                    orientation={"vertical"}
                    flexItem
                    sx={{marginTop: "1.5rem", backgroundColor: "primary.main"}}
                />
                <Grid item sx={{marginLeft: "5rem"}}>
                    <Typography sx={{fontSize: "large", color: "secondary.main"}}>
                        {randsl("UpdateHint.Desc")}
                    </Typography>
                </Grid>
            </Grid>
        </Container>
    );
}
