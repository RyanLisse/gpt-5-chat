import { useCallback, useState } from 'react';
import { ImageModal } from '../image-modal';

type ImageModalState = {
  isOpen: boolean;
  imageUrl: string;
  imageName?: string;
};

type ImageModalManagerHook = {
  imageModal: ImageModalState;
  handleImageClick: (imageUrl: string, imageName?: string) => void;
  handleImageModalClose: () => void;
  ImageModalComponent: React.FC;
};

export const useImageModalManager = (): ImageModalManagerHook => {
  const [imageModal, setImageModal] = useState<ImageModalState>({
    isOpen: false,
    imageUrl: '',
    imageName: undefined,
  });

  const handleImageClick = useCallback(
    (imageUrl: string, imageName?: string) => {
      setImageModal({
        isOpen: true,
        imageUrl,
        imageName,
      });
    },
    [],
  );

  const handleImageModalClose = useCallback(() => {
    setImageModal({
      isOpen: false,
      imageUrl: '',
      imageName: undefined,
    });
  }, []);

  const ImageModalComponent = useCallback(
    () => (
      <ImageModal
        imageName={imageModal.imageName}
        imageUrl={imageModal.imageUrl}
        isOpen={imageModal.isOpen}
        onClose={handleImageModalClose}
      />
    ),
    [imageModal, handleImageModalClose],
  );

  return {
    imageModal,
    handleImageClick,
    handleImageModalClose,
    ImageModalComponent,
  };
};
