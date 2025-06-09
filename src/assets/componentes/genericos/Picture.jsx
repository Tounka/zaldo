import React from 'react';
import styled from 'styled-components';



const PictureStyled = styled.picture`
  width: 100%;
  height: 100%;
  display: block;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

export const PictureBg = ({ imageSources, altText }) => {
  return (

    <PictureStyled>
      {imageSources?.map(({ src, media }, index) => (
        <source key={index} srcSet={src} media={media} />
      ))}
      <img src={imageSources?.[0]?.src || ''} alt={altText} />
    </PictureStyled>

  );
};

export const PictureGenerico = ({ src, alt }) => {
  return (
    <PictureStyled>
      <img src={src} alt={alt} loading="lazy" />
    </PictureStyled>
  )
}