import { useScroll, useTransform, useSpring, MotionValue } from "framer-motion";
import { RefObject } from "react";

interface ScrollAnimationOptions {
  offset?: [string, string];
  springConfig?: {
    stiffness?: number;
    damping?: number;
    mass?: number;
  };
}

export const useParallax = (
  scrollYProgress: MotionValue<number>,
  distance: number = 100
) => {
  return useTransform(scrollYProgress, [0, 1], [0, distance]);
};

export const useSectionScroll = (
  ref: RefObject<HTMLElement>,
  options: ScrollAnimationOptions = {}
) => {
  const { offset = ["start end", "end start"] } = options;
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: offset as any,
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: options.springConfig?.stiffness ?? 100,
    damping: options.springConfig?.damping ?? 30,
    mass: options.springConfig?.mass ?? 1,
  });

  return { scrollYProgress, smoothProgress };
};

export const useScrollOpacity = (
  scrollYProgress: MotionValue<number>,
  inputRange: [number, number] = [0.7, 1],
  outputRange: [number, number] = [1, 0]
) => {
  return useTransform(scrollYProgress, inputRange, outputRange);
};

export const useScrollBlur = (
  scrollYProgress: MotionValue<number>,
  inputRange: [number, number] = [0.7, 1],
  maxBlur: number = 10
) => {
  const blur = useTransform(scrollYProgress, inputRange, [0, maxBlur]);
  return useTransform(blur, (v) => `blur(${v}px)`);
};

export const useScrollScale = (
  scrollYProgress: MotionValue<number>,
  inputRange: [number, number] = [0, 1],
  outputRange: [number, number] = [1, 0.95]
) => {
  return useTransform(scrollYProgress, inputRange, outputRange);
};
