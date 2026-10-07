package tn.novafer.erp.common;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** TND arithmetic: three decimals (millimes), half-up rounding. */
public final class Money {

    public static final int SCALE = 3;
    public static final BigDecimal ZERO = BigDecimal.ZERO.setScale(SCALE);
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private Money() {
    }

    public static BigDecimal round(BigDecimal value) {
        return value == null ? ZERO : value.setScale(SCALE, RoundingMode.HALF_UP);
    }

    public static BigDecimal percent(BigDecimal base, BigDecimal ratePct) {
        return base.multiply(ratePct).divide(HUNDRED, 6, RoundingMode.HALF_UP);
    }

    public static BigDecimal nz(BigDecimal value) {
        return value == null ? ZERO : value;
    }
}
