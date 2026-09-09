package com.geotwo.cadviewercontrol;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;

@SpringBootApplication
public class CadViewerControlApplication extends SpringBootServletInitializer {

    public static void main(String[] args) {
        SpringApplication.run(CadViewerControlApplication.class, args);
    }

    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
        return application.sources(CadViewerControlApplication.class);
    }
}