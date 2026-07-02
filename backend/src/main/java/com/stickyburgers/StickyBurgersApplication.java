package com.stickyburgers;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class StickyBurgersApplication {

    public static void main(String[] args) {
        SpringApplication.run(StickyBurgersApplication.class, args);
    }
}
